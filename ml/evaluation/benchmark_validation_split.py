"""
FinGuard Phase 2B - Isolated Validation Benchmark Runner
Compares:
1. Existing FinGuard model (23 features, Raw & Platt Calibrated)
2. Kaggle Baseline XGBoost (392 features)
3. Kaggle Behavioural XGBoost (397 features)

Evaluated strictly on the identical 118,108 out-of-time validation transactions
from the IEEE-CIS Fraud Detection dataset.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    confusion_matrix
)

# Project paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "ml"))

from features import engineer_features_leakage_safe, CORE_23_FEATURES

DATA_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "ieee-fraud-detection")
TRANSACTION_CSV = os.path.join(DATA_DIR, "train_transaction.csv")
IDENTITY_CSV = os.path.join(DATA_DIR, "train_identity.csv")

KAGGLE_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "finguard_results")
KAGGLE_PREDS_CSV = os.path.join(KAGGLE_DIR, "validation_predictions.csv")

MODELS_DIR = os.path.join(PROJECT_ROOT, "ml", "models")
FINGUARD_MODEL_FILE = os.path.join(MODELS_DIR, "finguard_xgb.json")
FINGUARD_CALIBRATOR_FILE = os.path.join(MODELS_DIR, "finguard_calibrator.joblib")
FINGUARD_FEATURES_FILE = os.path.join(MODELS_DIR, "features.json")

RESULTS_DIR = os.path.join(PROJECT_ROOT, "results")
REPORT_FILE = os.path.join(RESULTS_DIR, "phase2_benchmark_report.json")


def compute_metrics(y_true, y_prob, threshold=0.5):
    """Computes comprehensive classification and probability calibration metrics."""
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = int(cm[0][0]), int(cm[0][1]), int(cm[1][0]), int(cm[1][1])
    
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    acc = float(accuracy_score(y_true, y_pred))
    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    brier = float(brier_score_loss(y_true, y_prob))

    return {
        "threshold": float(threshold),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "accuracy": round(acc, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "brier_score": round(brier, 4),
        "true_negatives": tn,
        "false_positives": fp,
        "false_negatives": fn,
        "true_positives": tp,
        "mean_predicted_prob": round(float(np.mean(y_prob)), 4),
        "max_predicted_prob": round(float(np.max(y_prob)), 4)
    }


def find_best_f1_threshold(y_true, y_prob):
    """Finds decision threshold maximizing F1 score."""
    best_f1 = -1.0
    best_thresh = 0.5
    for thresh in np.linspace(0.01, 0.99, 99):
        y_pred = (y_prob >= thresh).astype(int)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_thresh = thresh
    return float(best_thresh)


def run_benchmark():
    start_total_time = time.time()
    os.makedirs(RESULTS_DIR, exist_ok=True)

    print("=" * 80)
    print("      FINGUARD PHASE 2B: ISOLATED VALIDATION BENCHMARK RUNNER")
    print("=" * 80)

    # 1. Check artifact and dataset presence
    for p, name in [
        (TRANSACTION_CSV, "Full IEEE-CIS train_transaction.csv"),
        (IDENTITY_CSV, "Full IEEE-CIS train_identity.csv"),
        (KAGGLE_PREDS_CSV, "Kaggle validation_predictions.csv"),
        (FINGUARD_MODEL_FILE, "FinGuard booster (finguard_xgb.json)"),
        (FINGUARD_CALIBRATOR_FILE, "FinGuard calibrator (finguard_calibrator.joblib)"),
        (FINGUARD_FEATURES_FILE, "FinGuard features catalog (features.json)")
    ]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing required artifact '{name}' at path: {p}")

    # 2. Load dataset and establish alignment
    print("\n>>> [STEP 1] Loading IEEE-CIS Dataset and Establishing Split Alignment...")
    cols_to_load = [
        "TransactionID", "TransactionDT", "TransactionAmt", "ProductCD",
        "card1", "card2", "card4", "card6", "addr1", "dist1",
        "C1", "C2", "C4", "D1", "D2", "isFraud"
    ]
    t0 = time.time()
    df_tx = pd.read_csv(TRANSACTION_CSV, usecols=cols_to_load)
    print(f"[*] Loaded train_transaction.csv: {len(df_tx)} rows in {time.time() - t0:.2f}s")

    t0 = time.time()
    df_id = pd.read_csv(IDENTITY_CSV, usecols=["TransactionID", "DeviceType"])
    print(f"[*] Loaded train_identity.csv: {len(df_id)} rows in {time.time() - t0:.2f}s")

    # Left join on TransactionID to incorporate DeviceType
    df = pd.merge(df_tx, df_id, on="TransactionID", how="left")
    del df_tx, df_id

    # Canonical FinGuard customer identifier derivation
    print("[*] Deriving canonical FinGuard customer key from card and address fields...")
    df["customer_id"] = (
        df["card1"].astype(str) + "_" +
        df["card2"].fillna(0).astype(int).astype(str) + "_" +
        df["card4"].fillna("unknown") + "_" +
        df["card6"].fillna("unknown") + "_" +
        df["addr1"].fillna(0).astype(int).astype(str)
    )

    # Chronological sort
    print("[*] Sorting dataset strictly chronologically by (TransactionDT, TransactionID)...")
    df = df.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

    # 80/20 chronological split (472,432 train / 118,108 val)
    train_count = 472432
    val_count = 118108
    total_expected = train_count + val_count

    if len(df) != total_expected:
        raise ValueError(f"Expected {total_expected} total rows, but found {len(df)}")

    train_df = df.iloc[:train_count]
    val_df = df.iloc[train_count:].copy().reset_index(drop=True)

    # Load Kaggle validation predictions
    print(f"[*] Ingesting Kaggle validation predictions from: {KAGGLE_PREDS_CSV}")
    val_pred_df = pd.read_csv(KAGGLE_PREDS_CSV)

    # Alignment verification checks
    print("\n>>> [STEP 2] Running Strict Verification Checks on Validation Partition...")
    if len(val_df) != val_count:
        raise RuntimeError(f"Alignment Error: val_df has {len(val_df)} rows, expected {val_count}")

    if len(val_pred_df) != val_count:
        raise RuntimeError(f"Alignment Error: val_pred_df has {len(val_pred_df)} rows, expected {val_count}")

    labels_match = (val_df["isFraud"].values == val_pred_df["actual_isFraud"].values).all()
    if not labels_match:
        mismatches = np.sum(val_df["isFraud"].values != val_pred_df["actual_isFraud"].values)
        raise RuntimeError(f"Alignment Error: {mismatches} label mismatches detected between val_df and validation_predictions.csv!")

    unique_tx_ids = val_df["TransactionID"].nunique()
    if unique_tx_ids != val_count:
        raise RuntimeError(f"Alignment Error: val_df contains {val_count - unique_tx_ids} duplicate TransactionIDs!")

    y_true = val_df["isFraud"].astype(int).values
    fraud_count = int(np.sum(y_true))
    legit_count = len(y_true) - fraud_count
    fraud_rate = float(fraud_count) / float(len(y_true))

    print(f"  [+] Validation records:         {len(val_df):,}")
    print(f"  [+] Label agreement:            100.0% ({len(y_true):,} / {len(y_true):,})")
    print(f"  [+] Duplicate TransactionIDs:   0 (Unique: {unique_tx_ids:,})")
    print(f"  [+] Ground-truth fraud cases:   {fraud_count:,} ({fraud_rate*100:.4f}%)")
    print(f"  [+] Ground-truth legit cases:   {legit_count:,} ({(1-fraud_rate)*100:.4f}%)")
    print(f"  [+] Validation DT range:        [{int(val_df['TransactionDT'].min()):,} - {int(val_df['TransactionDT'].max()):,}]")

    # 3. Feature engineering for FinGuard 23-feature model
    print("\n>>> [STEP 3] Extracting Causal 23 Core Features for FinGuard Model...")
    # Pre-filter training history strictly to customers who appear in validation set
    val_customers = set(val_df["customer_id"].unique())
    relevant_train_df = train_df[train_df["customer_id"].isin(val_customers)].copy().reset_index(drop=True)
    print(f"[*] Pre-filtered relevant training history: {len(relevant_train_df):,} prior records across {len(val_customers):,} customer profiles")

    # Calculate population statistics strictly from the training partition
    train_pop_stats = {
        "mean_amt": float(train_df["TransactionAmt"].mean()),
        "std_amt": float(train_df["TransactionAmt"].std()),
        "median_amt": float(train_df["TransactionAmt"].median()),
        "min_hour": 8,
        "max_hour": 22,
        "primary_device": "desktop",
        "primary_card": "visa"
    }
    del train_df  # Free memory

    t0 = time.time()
    val_feat_df, _, feature_cols = engineer_features_leakage_safe(
        val_df,
        prior_history_df=relevant_train_df,
        pop_stats=train_pop_stats,
        feature_set="core"
    )
    print(f"[+] Successfully extracted {len(feature_cols)} core features in {time.time() - t0:.2f}s")
    del relevant_train_df

    # Verify feature matrix
    X_val = val_feat_df[CORE_23_FEATURES]
    if len(X_val) != val_count:
        raise RuntimeError(f"Feature matrix row count ({len(X_val)}) does not match validation count ({val_count})")
    if X_val.isnull().any().any():
        raise RuntimeError("Null values detected in FinGuard feature matrix!")

    # 4. FinGuard model inference
    print("\n>>> [STEP 4] Running Model Inferences on 118,108 Validation Records...")
    print(f"[*] Loading FinGuard booster from: {FINGUARD_MODEL_FILE}")
    booster = xgb.Booster()
    booster.load_model(FINGUARD_MODEL_FILE)
    dmat = xgb.DMatrix(X_val, feature_names=CORE_23_FEATURES)

    t0 = time.time()
    finguard_raw_probs = booster.predict(dmat)
    print(f"[+] FinGuard raw booster inference completed in {time.time() - t0:.2f}s")

    print(f"[*] Loading FinGuard calibrator from: {FINGUARD_CALIBRATOR_FILE}")
    calibrator = joblib.load(FINGUARD_CALIBRATOR_FILE)
    t0 = time.time()
    finguard_cal_probs = calibrator.predict_proba(X_val.values)[:, 1]
    print(f"[+] FinGuard Platt calibrator inference completed in {time.time() - t0:.2f}s")

    # Ingest Kaggle predictions
    kaggle_baseline_probs = val_pred_df["baseline_probability"].values
    kaggle_behavioural_probs = val_pred_df["behavioural_probability"].values

    # 5. Evaluate all models
    print("\n>>> [STEP 5] Computing Benchmark Performance Metrics across All Models...")

    # Threshold 0.50 comparison (Standard Kaggle benchmark threshold)
    metrics_kaggle_baseline = compute_metrics(y_true, kaggle_baseline_probs, threshold=0.5)
    metrics_kaggle_behavioural = compute_metrics(y_true, kaggle_behavioural_probs, threshold=0.5)
    metrics_finguard_raw_05 = compute_metrics(y_true, finguard_raw_probs, threshold=0.5)
    metrics_finguard_cal_05 = compute_metrics(y_true, finguard_cal_probs, threshold=0.5)

    # Optimal F1 threshold for FinGuard models (Domain adaptation check)
    finguard_raw_opt_thresh = find_best_f1_threshold(y_true, finguard_raw_probs)
    finguard_cal_opt_thresh = find_best_f1_threshold(y_true, finguard_cal_probs)
    metrics_finguard_raw_opt = compute_metrics(y_true, finguard_raw_probs, threshold=finguard_raw_opt_thresh)
    metrics_finguard_cal_opt = compute_metrics(y_true, finguard_cal_probs, threshold=finguard_cal_opt_thresh)

    # Print comparative results table
    print("\n" + "=" * 115)
    print(f"{'Model / Configuration':<42} | {'Thresh':<6} | {'PR-AUC':<7} | {'ROC-AUC':<7} | {'F1':<7} | {'Prec':<7} | {'Recall':<7} | {'Brier':<7} | {'FP':<6}")
    print("-" * 115)
    print(f"{'Kaggle Baseline XGBoost (392 feats)':<42} | 0.5000 | {metrics_kaggle_baseline['pr_auc']:<7.4f} | {metrics_kaggle_baseline['roc_auc']:<7.4f} | {metrics_kaggle_baseline['f1_score']:<7.4f} | {metrics_kaggle_baseline['precision']:<7.4f} | {metrics_kaggle_baseline['recall']:<7.4f} | {metrics_kaggle_baseline['brier_score']:<7.4f} | {metrics_kaggle_baseline['false_positives']:<6d}")
    print(f"{'Kaggle Behavioural XGBoost (397 feats)':<42} | 0.5000 | {metrics_kaggle_behavioural['pr_auc']:<7.4f} | {metrics_kaggle_behavioural['roc_auc']:<7.4f} | {metrics_kaggle_behavioural['f1_score']:<7.4f} | {metrics_kaggle_behavioural['precision']:<7.4f} | {metrics_kaggle_behavioural['recall']:<7.4f} | {metrics_kaggle_behavioural['brier_score']:<7.4f} | {metrics_kaggle_behavioural['false_positives']:<6d}")
    print(f"{'FinGuard Production Model (Raw 23 feats)':<42} | 0.5000 | {metrics_finguard_raw_05['pr_auc']:<7.4f} | {metrics_finguard_raw_05['roc_auc']:<7.4f} | {metrics_finguard_raw_05['f1_score']:<7.4f} | {metrics_finguard_raw_05['precision']:<7.4f} | {metrics_finguard_raw_05['recall']:<7.4f} | {metrics_finguard_raw_05['brier_score']:<7.4f} | {metrics_finguard_raw_05['false_positives']:<6d}")
    print(f"{'FinGuard Production Model (Cal 23 feats)':<42} | 0.5000 | {metrics_finguard_cal_05['pr_auc']:<7.4f} | {metrics_finguard_cal_05['roc_auc']:<7.4f} | {metrics_finguard_cal_05['f1_score']:<7.4f} | {metrics_finguard_cal_05['precision']:<7.4f} | {metrics_finguard_cal_05['recall']:<7.4f} | {metrics_finguard_cal_05['brier_score']:<7.4f} | {metrics_finguard_cal_05['false_positives']:<6d}")
    print("-" * 115)
    print(f"{'FinGuard Raw (Tuned F1 Threshold)':<42} | {finguard_raw_opt_thresh:<6.4f} | {metrics_finguard_raw_opt['pr_auc']:<7.4f} | {metrics_finguard_raw_opt['roc_auc']:<7.4f} | {metrics_finguard_raw_opt['f1_score']:<7.4f} | {metrics_finguard_raw_opt['precision']:<7.4f} | {metrics_finguard_raw_opt['recall']:<7.4f} | {metrics_finguard_raw_opt['brier_score']:<7.4f} | {metrics_finguard_raw_opt['false_positives']:<6d}")
    print(f"{'FinGuard Cal (Tuned F1 Threshold)':<42} | {finguard_cal_opt_thresh:<6.4f} | {metrics_finguard_cal_opt['pr_auc']:<7.4f} | {metrics_finguard_cal_opt['roc_auc']:<7.4f} | {metrics_finguard_cal_opt['f1_score']:<7.4f} | {metrics_finguard_cal_opt['precision']:<7.4f} | {metrics_finguard_cal_opt['recall']:<7.4f} | {metrics_finguard_cal_opt['brier_score']:<7.4f} | {metrics_finguard_cal_opt['false_positives']:<6d}")
    print("=" * 115 + "\n")

    # 6. Build and save output report
    print(f"\n>>> [STEP 6] Saving Structured Benchmark Report to: {REPORT_FILE}")
    report_data = {
        "benchmark_title": "FinGuard Phase 2B Isolated Validation Benchmark",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_alignment": {
            "validation_records": len(val_df),
            "label_agreement_verified": True,
            "unique_transaction_ids": unique_tx_ids,
            "duplicate_transaction_ids": 0,
            "fraud_prevalence_percent": round(fraud_rate * 100.0, 4),
            "total_fraud_count": fraud_count,
            "total_legitimate_count": legit_count,
            "transaction_dt_range": [int(val_df["TransactionDT"].min()), int(val_df["TransactionDT"].max())]
        },
        "models_evaluated": {
            "kaggle_baseline_xgboost_392": {
                "features_count": 392,
                "metrics_at_0_50": metrics_kaggle_baseline
            },
            "kaggle_behavioural_xgboost_397": {
                "features_count": 397,
                "metrics_at_0_50": metrics_kaggle_behavioural
            },
            "finguard_production_raw_23": {
                "features_count": 23,
                "metrics_at_0_50": metrics_finguard_raw_05,
                "metrics_at_optimal_f1": metrics_finguard_raw_opt
            },
            "finguard_production_calibrated_23": {
                "features_count": 23,
                "metrics_at_0_50": metrics_finguard_cal_05,
                "metrics_at_optimal_f1": metrics_finguard_cal_opt
            }
        },
        "analysis": {
            "kaggle_behavioural_vs_baseline_delta": {
                "pr_auc_delta": round(metrics_kaggle_behavioural["pr_auc"] - metrics_kaggle_baseline["pr_auc"], 4),
                "roc_auc_delta": round(metrics_kaggle_behavioural["roc_auc"] - metrics_kaggle_baseline["roc_auc"], 4),
                "f1_delta": round(metrics_kaggle_behavioural["f1_score"] - metrics_kaggle_baseline["f1_score"], 4),
                "false_positive_reduction": metrics_kaggle_baseline["false_positives"] - metrics_kaggle_behavioural["false_positives"]
            },
            "finguard_out_of_domain_transfer": {
                "pr_auc": metrics_finguard_raw_05["pr_auc"],
                "roc_auc": metrics_finguard_raw_05["roc_auc"],
                "note": "FinGuard production booster was trained on a 1,650-sample benchmark dataset (286x smaller than Kaggle training set of 472,432 samples)."
            }
        }
    }

    with open(REPORT_FILE, "w") as f:
        json.dump(report_data, f, indent=2)

    total_duration = time.time() - start_total_time
    print(f"[SUCCESS] Benchmark completed in {total_duration:.2f} seconds.")
    print(f"[+] Output verified and saved to: {REPORT_FILE}")


if __name__ == "__main__":
    run_benchmark()
