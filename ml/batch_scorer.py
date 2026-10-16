"""
FinGuard - Non-Destructive Batch Scorer & SHAP Explanation Engine
Scores transaction batches with probability calibration, generates SHAP explanations,
and writes non-destructively to MongoDB with batch versioning, model traceability,
and structured decision support documents:
  - batches
  - models
  - customers (upsert)
  - behaviour_profiles (upsert)
  - transactions (with batch_id)
  - risk_scores (with raw_probability & calibrated_probability)
  - alerts (with batch_id, primary driver, and cold-start flag)
  - explanations (local drivers + global importance)
"""

import os
import json
import time
from datetime import datetime, timezone, timedelta
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
import joblib
import pymongo

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_FILE = os.path.join(MODEL_DIR, "finguard_xgb.json")
CALIBRATOR_FILE = os.path.join(MODEL_DIR, "finguard_calibrator.joblib")
FEATURES_FILE = os.path.join(MODEL_DIR, "features.json")
METADATA_FILE = os.path.join(MODEL_DIR, "model_metadata.json")
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB", "finguard")
BASE_DATE = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {
        "risk_thresholds": {
            "low_threshold": 40.0,
            "high_threshold": 75.0
        }
    }


def load_model_metadata():
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    return {
        "model_version": "XGBoost-v2.0-temporal",
        "algorithm": "XGBoost Classifier"
    }


def generate_batch_id(db):
    """Generates an auto-incrementing, human-readable batch identifier: BATCH-YYYY-NNNN."""
    year = datetime.now(timezone.utc).strftime("%Y")
    count = db["batches"].count_documents({}) + 1
    return f"BATCH-{year}-{count:04d}"


def format_factor_description(feat_name, val, shap_val):
    """
    Translates SHAP features and values into clear, plain-English
    decision-support explanations for fraud analysts without fabrication.
    """
    direction = "increases" if shap_val > 0 else "reduces"

    if feat_name == "amt_to_baseline_ratio":
        if val > 1.2:
            return f"Amount is {val:.1f}x higher than customer's baseline average ({direction} risk)"
        elif val < 0.8:
            return f"Amount is within typical spending baseline ({direction} risk)"
        return f"Amount is consistent with customer baseline ({val:.1f}x)"

    elif feat_name == "amt_zscore":
        if abs(val) >= 2.0:
            return f"Amount deviates {val:.1f} standard deviations from historical spending"
        return f"Amount standard deviation index: {val:.2f}"

    elif feat_name == "velocity_rapid_tx_flag":
        if val == 1:
            return f"Velocity burst detected: rapid transaction within minutes of prior activity ({direction} risk)"
        return "Normal interval between transactions"

    elif feat_name == "velocity_hours_since_last_tx":
        if val < 0.25:
            return f"Only {int(val * 60)} minutes elapsed since previous transaction"
        elif val >= 999.0:
            return "First observed transaction for this customer profile (cold start)"
        return f"{val:.1f} hours elapsed since previous transaction"

    elif feat_name == "is_off_hours":
        if val == 1:
            return f"Transaction executed outside customer's regular active hours ({direction} risk)"
        return "Transaction within customer's normal operating hours"

    elif feat_name == "device_anomaly_flag":
        if val == 1:
            return f"Unrecognized device used for this transaction ({direction} risk)"
        return "Standard registered device confirmed"

    elif feat_name == "tx_freq_24h" or feat_name == "transactions_24h":
        if val > 5:
            return f"High frequency: {int(val)} transactions executed within 24 hours"
        return f"Standard daily frequency: {int(val)} transactions in 24 hours"

    elif feat_name == "spend_24h_to_baseline_ratio":
        if val > 2.0:
            return f"24-hour total spend is {val:.1f}x customer's normal baseline"
        return f"24-hour spend volume is consistent with history ({val:.1f}x)"

    elif feat_name == "TransactionAmt":
        return f"Transaction dollar amount: ${val:,.2f}"

    elif feat_name == "cold_start_customer_flag":
        if val == 1:
            return "Customer has limited prior history; scored using population baseline"
        return "Customer has established historical profile"

    elif feat_name in ("C1", "C2", "C4"):
        return f"Velocity counter {feat_name}: {int(val)}"

    elif feat_name == "dist1":
        if val > 100:
            return f"Substantial geographic distance from billing address ({val:.0f} miles)"
        return f"Local transaction proximity ({val:.0f} miles)"

    return f"{feat_name} = {val} ({direction} risk by {abs(shap_val):.3f})"


def score_batch(limit=None):
    """
    Executes a complete, non-destructive batch scoring cycle:
    1. Loads XGBoost model, calibrator, and feature catalog
    2. Builds causal features and baselines
    3. Computes raw and calibrated probabilities
    4. Computes SHAP local explanations and global feature importance
    5. Records batch metadata and version tracking in MongoDB
    6. Non-destructively inserts scored transactions, alerts, and explanations
    """
    start_time = time.time()
    started_at = datetime.now(timezone.utc).isoformat()

    if not os.path.exists(MODEL_FILE) or not os.path.exists(FEATURES_FILE):
        raise FileNotFoundError("Model or feature catalog not found. Please train model first.")

    with open(FEATURES_FILE, "r") as f:
        feature_cols = json.load(f)

    config = load_config()
    low_thresh = float(config.get("risk_thresholds", {}).get("low_threshold", 40.0))
    high_thresh = float(config.get("risk_thresholds", {}).get("high_threshold", 75.0))
    model_meta = load_model_metadata()

    # 1. Load trained XGBoost model and calibrator
    print(f"[*] Loading native XGBoost model from {MODEL_FILE}...")
    booster = xgb.Booster()
    booster.load_model(MODEL_FILE)

    calibrator = None
    if os.path.exists(CALIBRATOR_FILE):
        print(f"[*] Loading probability calibrator from {CALIBRATOR_FILE}...")
        calibrator = joblib.load(CALIBRATOR_FILE)
    else:
        print("[!] No calibrator found. Fallback to raw probabilities.")

    # 2. Ingest raw dataset and compute leakage-safe features
    df_raw = load_raw_dataset().sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
    df, profiles, _ = engineer_features_leakage_safe(df_raw, feature_set="core")

    if limit is not None and limit < len(df):
        df = df.iloc[:limit].copy().reset_index(drop=True)
        print(f"[*] Scoring batch subset of {limit} transactions...")

    X = df[feature_cols]

    # 3. Compute raw and calibrated probabilities
    print("[*] Generating model predictions and calibrated risk scores...")
    dmatrix = xgb.DMatrix(X, feature_names=feature_cols)
    raw_probs = booster.predict(dmatrix)

    if calibrator is not None:
        cal_probs = calibrator.predict_proba(X)[:, 1]
    else:
        cal_probs = raw_probs

    # 4. Generate SHAP explanations
    print("[*] Computing SHAP explainability factors...")
    explainer = shap.TreeExplainer(booster)
    shap_values = explainer.shap_values(dmatrix)
    base_value = float(explainer.expected_value) if hasattr(explainer, "expected_value") else 0.0

    # Global feature importance across the batch
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    global_importance = [
        {"feature": feature_cols[idx], "importance": round(float(mean_abs_shap[idx]), 4)}
        for idx in np.argsort(mean_abs_shap)[::-1]
    ]

    # 5. Connect to MongoDB
    print(f"[*] Connecting to MongoDB at {MONGO_URI} (db: {DB_NAME})...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    batch_id = generate_batch_id(db)
    print(f"[+] Assigned Batch Identifier: {batch_id}")

    # 6. Upsert Customer Profiles & Baselines (Non-destructive)
    print(f"[*] Upserting {len(profiles)} customer profiles & baselines...")
    col_customers = db["customers"]
    col_profiles = db["behaviour_profiles"]

    for p in profiles:
        cid = p["customer_id"]
        sample_rows = df[df["customer_id"] == cid]
        if not sample_rows.empty:
            s_row = sample_rows.iloc[0]
            col_customers.update_one(
                {"_id": cid},
                {"$set": {
                    "customer_id": cid,
                    "full_name": str(s_row.get("customer_name", f"Customer {cid}")),
                    "email": str(s_row.get("customer_email", f"{cid.lower()}@example.com")),
                    "card1": int(s_row["card1"]),
                    "card4": str(s_row["card4"]),
                    "card6": str(s_row["card6"]),
                    "addr1": float(s_row["addr1"]),
                    "addr2": float(s_row["addr2"]),
                    "primary_device": str(p["primary_device"]),
                    "status": "ACTIVE",
                    "last_active_batch": batch_id,
                    "updated_at": started_at
                }},
                upsert=True
            )

        col_profiles.update_one(
            {"_id": cid},
            {"$set": {
                **p,
                "batch_id": batch_id,
                "last_updated": started_at
            }},
            upsert=True
        )

    # 7. Process Transactions, Risk Scores, Alerts, and Explanations
    tx_records = []
    score_records = []
    alert_records = []
    expl_records = []

    high_risk_count = 0
    med_risk_count = 0
    low_risk_count = 0
    fraud_label_count = 0

    for i in range(len(df)):
        row = df.iloc[i]
        tx_id = int(row["TransactionID"])
        tx_id_str = str(tx_id)
        cid = str(row["customer_id"])
        raw_prob = float(raw_probs[i])
        cal_prob = float(cal_probs[i])

        # Risk score derived from calibrated probability
        risk_score = round(cal_prob * 100.0, 1)

        if risk_score >= high_thresh:
            risk_level = "HIGH"
            high_risk_count += 1
        elif risk_score >= low_thresh:
            risk_level = "MEDIUM"
            med_risk_count += 1
        else:
            risk_level = "LOW"
            low_risk_count += 1

        is_fraud = int(row.get("isFraud", 0))
        if is_fraud == 1:
            fraud_label_count += 1

        # Real timestamp: TransactionDT added to BASE_DATE
        tx_dt_sec = int(row["TransactionDT"])
        tx_timestamp = (BASE_DATE + timedelta(seconds=tx_dt_sec)).isoformat()

        # Transaction document
        tx_records.append({
            "_id": f"{batch_id}_{tx_id}",
            "transaction_id": tx_id,
            "batch_id": batch_id,
            "customer_id": cid,
            "amount": float(round(row["TransactionAmt"], 2)),
            "product_cd": str(row["ProductCD"]),
            "card4": str(row["card4"]),
            "card6": str(row["card6"]),
            "device_type": str(row["DeviceType"]),
            "device_info": str(row["DeviceInfo"]),
            "hour_of_day": int(row["hour_of_day"]),
            "day_of_week": int(row["day_of_week"]),
            "TransactionDT": tx_dt_sec,
            "timestamp": tx_timestamp,
            "is_fraud_ground_truth": is_fraud,
            "cold_start_customer_flag": int(row.get("cold_start_customer_flag", 0)),
            "created_at": started_at
        })

        # Risk score document
        score_records.append({
            "_id": f"{batch_id}_{tx_id}",
            "transaction_id": tx_id,
            "batch_id": batch_id,
            "customer_id": cid,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "raw_probability": round(raw_prob, 4),
            "calibrated_probability": round(cal_prob, 4),
            "model_version": model_meta.get("model_version", "XGBoost-v2.0-temporal"),
            "scored_at": started_at
        })

        # SHAP factor decomposition
        row_shap = shap_values[i]
        top_indices = np.argsort(np.abs(row_shap))[::-1]

        top_factors = []
        positive_drivers = []
        negative_drivers = []
        primary_driver = "Behavioural Baseline Deviation"
        top_pos_shap = -999.0

        for rank, idx in enumerate(top_indices):
            f_name = feature_cols[idx]
            f_val = float(row[f_name])
            s_val = float(round(row_shap[idx], 4))
            impact = "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK"
            desc = format_factor_description(f_name, f_val, s_val)

            factor_item = {
                "feature": f_name,
                "value": round(f_val, 2),
                "shap_value": s_val,
                "impact": impact,
                "description": desc
            }

            if rank < 6:
                top_factors.append(factor_item)

            if s_val > 0:
                positive_drivers.append(factor_item)
                if s_val > top_pos_shap:
                    top_pos_shap = s_val
                    if "device" in f_name:
                        primary_driver = "Device Anomaly"
                    elif "amt" in f_name:
                        primary_driver = "Amount Deviation"
                    elif "velocity" in f_name:
                        primary_driver = "Transaction Velocity"
                    elif "hour" in f_name or "is_off_hours" in f_name:
                        primary_driver = "Time Deviation"
                    elif "dist" in f_name:
                        primary_driver = "Location Change"
                    elif "freq" in f_name or "C1" in f_name or "C2" in f_name:
                        primary_driver = "Frequency Spike"
            else:
                negative_drivers.append(factor_item)

        # Alert document (Flag HIGH and MEDIUM alerts only)
        if risk_score >= low_thresh:
            alert_records.append({
                "_id": f"ALT_{batch_id}_{tx_id}",
                "alert_id": f"ALT_{batch_id}_{tx_id}",
                "transaction_id": tx_id,
                "batch_id": batch_id,
                "customer_id": cid,
                "customer_name": str(row.get("customer_name", f"Customer {cid}")),
                "amount": float(round(row["TransactionAmt"], 2)),
                "risk_score": risk_score,
                "risk_level": risk_level,
                "primary_risk_driver": primary_driver,
                "cold_start_flag": int(row.get("cold_start_customer_flag", 0)),
                "status": "NEW",
                "timestamp": tx_timestamp,
                "created_at": started_at,
                "analyst_notes": ""
            })

        # Explanation document
        expl_records.append({
            "_id": f"{batch_id}_{tx_id}",
            "transaction_id": tx_id,
            "batch_id": batch_id,
            "customer_id": cid,
            "base_value": round(base_value, 4),
            "top_factors": top_factors,
            "positive_drivers": positive_drivers[:5],
            "negative_drivers": negative_drivers[:5],
            "generated_at": started_at
        })

    # Non-destructive batch insert
    if tx_records:
        db["transactions"].insert_many(tx_records)
    if score_records:
        db["risk_scores"].insert_many(score_records)
    if alert_records:
        db["alerts"].insert_many(alert_records)
    if expl_records:
        db["explanations"].insert_many(expl_records)

    elapsed_sec = round(time.time() - start_time, 2)
    completed_at = datetime.now(timezone.utc).isoformat()

    # 8. Record Batch Document in 'batches' collection
    batch_doc = {
        "batch_id": batch_id,
        "model_version": model_meta.get("model_version", "XGBoost-v2.0-temporal"),
        "dataset_version": "IEEE-CIS-2200",
        "started_at": started_at,
        "completed_at": completed_at,
        "transaction_count": len(df),
        "fraud_count": fraud_label_count,
        "high_risk_count": high_risk_count,
        "medium_risk_count": med_risk_count,
        "low_risk_count": low_risk_count,
        "risk_thresholds": {
            "low_threshold": low_thresh,
            "high_threshold": high_thresh
        },
        "processing_time_seconds": elapsed_sec,
        "status": "COMPLETED",
        "global_feature_importance": global_importance[:10]
    }
    db["batches"].insert_one(batch_doc)
    print(f"[+] Recorded batch document for {batch_id} in 'batches' collection.")

    # 9. Record / Update Model Document in 'models' collection
    db["models"].update_one(
        {"model_version": model_meta.get("model_version", "XGBoost-v2.0-temporal")},
        {"$set": {
            **model_meta,
            "last_used_batch": batch_id,
            "last_scored_at": completed_at
        }},
        upsert=True
    )
    print(f"[+] Updated model metadata for {model_meta.get('model_version')} in 'models' collection.")

    print("\n" + "=" * 70)
    print(f"        FINGUARD BATCH SCORING COMPLETE (BATCH: {batch_id})")
    print("=" * 70)
    print(f"  Target Database:          {DB_NAME}")
    print(f"  Total Scored:             {len(df)} transactions in {elapsed_sec}s")
    print(f"  High Risk (Score >= {high_thresh:.0f}):  {high_risk_count}")
    print(f"  Medium Risk ({low_thresh:.0f} - {high_thresh-1:.0f}):    {med_risk_count}")
    print(f"  Low Risk (Score < {low_thresh:.0f}):    {low_risk_count}")
    print("-" * 70)
    print("  MongoDB Collection Totals:")
    print(f"    - batches:              {db['batches'].count_documents({})}")
    print(f"    - customers:            {db['customers'].count_documents({})}")
    print(f"    - behaviour_profiles:   {db['behaviour_profiles'].count_documents({})}")
    print(f"    - transactions:         {db['transactions'].count_documents({})}")
    print(f"    - risk_scores:          {db['risk_scores'].count_documents({})}")
    print(f"    - alerts:               {db['alerts'].count_documents({})}")
    print(f"    - explanations:         {db['explanations'].count_documents({})}")
    print("=" * 70 + "\n")

    return batch_doc


if __name__ == "__main__":
    score_batch()
