"""
FinGuard - Model Training & Evaluation Module (Leakage-Safe & Temporal)
Supports:
- Temporal train/test evaluation (chronological cutoff)
- Stratified train/test evaluation (legacy benchmark)
- Baseline XGBoost training with native JSON persistence
- Probability calibration (Platt scaling / Sigmoid)
- PR-AUC, ROC-AUC, Brier score, and Expected Calibration Error (ECE)
- Automated experiment and model version metadata recording
"""

import os
import sys
import json
import argparse
from datetime import datetime
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib

from sklearn.model_selection import train_test_split
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    accuracy_score,
    confusion_matrix
)

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe, CORE_23_FEATURES, EXTENDED_FEATURES

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_FILE = os.path.join(MODEL_DIR, "finguard_xgb.json")
CALIBRATOR_FILE = os.path.join(MODEL_DIR, "finguard_calibrator.joblib")
FEATURES_FILE = os.path.join(MODEL_DIR, "features.json")
METADATA_FILE = os.path.join(MODEL_DIR, "model_metadata.json")
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {
        "model": {
            "version": "v2.0-temporal",
            "n_estimators": 100,
            "max_depth": 4,
            "learning_rate": 0.06,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "reg_lambda": 2.0,
            "scale_pos_weight": 4.0,
            "random_state": 42
        }
    }


def calculate_ece(y_true, y_prob, n_bins=10):
    """Calculate Expected Calibration Error (ECE)."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_lower, bin_upper = bin_boundaries[i], bin_boundaries[i + 1]
        in_bin = (y_prob >= bin_lower) & (y_prob < bin_upper) if i < n_bins - 1 else (y_prob >= bin_lower) & (y_prob <= bin_upper)
        prop_in_bin = np.mean(in_bin)
        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(y_true[in_bin])
            avg_confidence_in_bin = np.mean(y_prob[in_bin])
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
    return float(ece)


def train_model(evaluation_mode="temporal", feature_set="core", calibrate=True):
    """
    Executes end-to-end model training:
    1. Loads dataset
    2. Splits data temporally or stratified BEFORE feature computation
    3. Builds customer behavioural profiles causally
    4. Trains XGBoost with class-imbalance weighting
    5. Calibrates output probabilities using Platt scaling (Sigmoid)
    6. Saves native JSON model, calibrator, and feature catalog
    7. Evaluates Precision, Recall, F1, ROC-AUC, PR-AUC, Brier Score, and ECE
    """
    os.makedirs(MODEL_DIR, exist_ok=True)
    config = load_config()
    model_cfg = config.get("model", {})

    print(f"[*] Starting FinGuard Training Pipeline (Mode: {evaluation_mode.upper()}, Features: {feature_set.upper()})...")

    # 1. Load raw dataset
    df_raw = load_raw_dataset()
    df_raw = df_raw.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

    # 2. Data Splitting BEFORE feature engineering to prevent leakage
    total_tx = len(df_raw)
    total_fraud = int(df_raw["isFraud"].sum())
    total_legit = total_tx - total_fraud
    print(f"[*] Total dataset: {total_tx} transactions ({total_fraud} fraud, {total_legit} legitimate)")

    if evaluation_mode == "temporal":
        # 75% chronological split
        cutoff_idx = int(total_tx * 0.75)
        df_train_raw = df_raw.iloc[:cutoff_idx].copy().reset_index(drop=True)
        df_test_raw = df_raw.iloc[cutoff_idx:].copy().reset_index(drop=True)
    else:
        # Stratified random split
        train_idx, test_idx = train_test_split(
            np.arange(total_tx),
            test_size=0.25,
            random_state=42,
            stratify=df_raw["isFraud"]
        )
        df_train_raw = df_raw.iloc[train_idx].sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
        df_test_raw = df_raw.iloc[test_idx].sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

    # Compute date/time ranges for reporting
    train_min_dt, train_max_dt = int(df_train_raw["TransactionDT"].min()), int(df_train_raw["TransactionDT"].max())
    test_min_dt, test_max_dt = int(df_test_raw["TransactionDT"].min()), int(df_test_raw["TransactionDT"].max())

    train_fraud = int(df_train_raw["isFraud"].sum())
    train_legit = len(df_train_raw) - train_fraud
    test_fraud = int(df_test_raw["isFraud"].sum())
    test_legit = len(df_test_raw) - test_fraud

    print(f"[*] Training Period: DT [{train_min_dt} - {train_max_dt}] | {len(df_train_raw)} tx ({train_fraud} fraud, {train_legit} legit)")
    print(f"[*] Testing Period:  DT [{test_min_dt} - {test_max_dt}] | {len(df_test_raw)} tx ({test_fraud} fraud, {test_legit} legit)")

    # 3. Leakage-Safe Feature Engineering
    # Train set: features built strictly from training transactions
    df_train_feat, train_profiles, feature_cols = engineer_features_leakage_safe(
        df_train_raw,
        feature_set=feature_set
    )
    # Test set: features built strictly using historical transactions up to test point
    df_test_feat, test_profiles, _ = engineer_features_leakage_safe(
        df_test_raw,
        prior_history_df=df_train_raw,
        feature_set=feature_set
    )

    X_train = df_train_feat[feature_cols]
    y_train = df_train_feat["isFraud"].astype(int)
    X_test = df_test_feat[feature_cols]
    y_test = df_test_feat["isFraud"].astype(int)

    # 4. Class Imbalance Weighting
    scale_weight = float(train_legit) / float(max(1, train_fraud))
    calibrated_weight = min(float(model_cfg.get("scale_pos_weight", 4.0)), scale_weight)

    # 5. Train XGBoost Model
    print("[*] Training Base XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=int(model_cfg.get("n_estimators", 100)),
        max_depth=int(model_cfg.get("max_depth", 4)),
        learning_rate=float(model_cfg.get("learning_rate", 0.06)),
        subsample=float(model_cfg.get("subsample", 0.85)),
        colsample_bytree=float(model_cfg.get("colsample_bytree", 0.85)),
        reg_lambda=float(model_cfg.get("reg_lambda", 2.0)),
        scale_pos_weight=calibrated_weight,
        eval_metric="logloss",
        random_state=int(model_cfg.get("random_state", 42))
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=False
    )

    # 6. Probability Calibration (Platt Scaling)
    calibrator = None
    if calibrate:
        print("[*] Performing Platt Scaling (Sigmoid) Probability Calibration...")
        # Calibrate using 3-fold CV on training set to avoid leaking test labels
        calibrator = CalibratedClassifierCV(estimator=model, method="sigmoid", cv=3)
        calibrator.fit(X_train, y_train)
        joblib.dump(calibrator, CALIBRATOR_FILE)
        print(f"[+] Successfully saved calibrator to: {CALIBRATOR_FILE}")

    # 7. Model Evaluation (Raw vs Calibrated)
    raw_probs = model.predict_proba(X_test)[:, 1]
    if calibrator is not None:
        cal_probs = calibrator.predict_proba(X_test)[:, 1]
    else:
        cal_probs = raw_probs

    y_pred = (cal_probs >= 0.5).astype(int)

    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    acc = float(accuracy_score(y_test, y_pred))
    roc_auc = float(roc_auc_score(y_test, cal_probs))
    pr_auc = float(average_precision_score(y_test, cal_probs))
    brier_raw = float(brier_score_loss(y_test, raw_probs))
    brier_cal = float(brier_score_loss(y_test, cal_probs))
    ece_raw = calculate_ece(y_test.values, raw_probs)
    ece_cal = calculate_ece(y_test.values, cal_probs)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 70)
    print(f"       FINGUARD MODEL EVALUATION REPORT ({evaluation_mode.upper()} MODE)")
    print("=" * 70)
    print(f"  Evaluation Mode:            {evaluation_mode.upper()}")
    print(f"  Feature Set ({len(feature_cols)} feats):     {feature_set.upper()}")
    print(f"  Training Span:              DT {train_min_dt} -> {train_max_dt} ({len(df_train_raw)} tx)")
    print(f"  Testing Span:               DT {test_min_dt} -> {test_max_dt} ({len(df_test_raw)} tx)")
    print("-" * 70)
    print(f"  Precision:                  {precision:.4f} ({precision*100:.1f}%)")
    print(f"  Recall:                     {recall:.4f} ({recall*100:.1f}%)")
    print(f"  F1-Score:                   {f1:.4f}")
    print(f"  Accuracy:                   {acc:.4f} ({acc*100:.1f}%)")
    print(f"  ROC-AUC:                    {roc_auc:.4f}")
    print(f"  PR-AUC (Avg Precision):     {pr_auc:.4f}")
    print("-" * 70)
    print("  Probability Calibration:")
    print(f"    Raw Brier Score:          {brier_raw:.4f} | Calibrated Brier Score: {brier_cal:.4f}")
    print(f"    Raw ECE:                  {ece_raw:.4f} | Calibrated ECE:         {ece_cal:.4f}")
    print("-" * 70)
    print("  Confusion Matrix:")
    print(f"    [[TN={cm[0][0]:4d}, FP={cm[0][1]:4d}]")
    print(f"     [FN={cm[1][0]:4d}, TP={cm[1][1]:4d}]]")
    print("=" * 70 + "\n")

    # 8. Save Native JSON Model and Feature List
    model.save_model(MODEL_FILE)
    print(f"[+] Saved native XGBoost model to: {MODEL_FILE}")

    with open(FEATURES_FILE, "w") as f:
        json.dump(feature_cols, f, indent=2)
    print(f"[+] Saved feature catalog ({len(feature_cols)} features) to: {FEATURES_FILE}")

    # 9. Save Detailed Model Metadata
    model_version = f"XGBoost-v2.0-{evaluation_mode}"
    metadata = {
        "model_id": f"MDL-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        "model_version": model_version,
        "algorithm": "XGBoost Classifier",
        "created_at": datetime.now().isoformat(),
        "evaluation_mode": evaluation_mode,
        "feature_set": feature_set,
        "feature_count": len(feature_cols),
        "feature_list": feature_cols,
        "hyperparameters": {
            "n_estimators": int(model_cfg.get("n_estimators", 100)),
            "max_depth": int(model_cfg.get("max_depth", 4)),
            "learning_rate": float(model_cfg.get("learning_rate", 0.06)),
            "subsample": float(model_cfg.get("subsample", 0.85)),
            "colsample_bytree": float(model_cfg.get("colsample_bytree", 0.85)),
            "reg_lambda": float(model_cfg.get("reg_lambda", 2.0)),
            "scale_pos_weight": calibrated_weight,
            "random_state": 42
        },
        "dataset_statistics": {
            "total_transactions": total_tx,
            "total_fraud": total_fraud,
            "total_legitimate": total_legit,
            "training_count": len(df_train_raw),
            "training_fraud": train_fraud,
            "training_legitimate": train_legit,
            "training_dt_min": train_min_dt,
            "training_dt_max": train_max_dt,
            "test_count": len(df_test_raw),
            "test_fraud": test_fraud,
            "test_legitimate": test_legit,
            "test_dt_min": test_min_dt,
            "test_dt_max": test_max_dt
        },
        "metrics": {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "accuracy": round(acc, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "brier_score_raw": round(brier_raw, 4),
            "brier_score_calibrated": round(brier_cal, 4),
            "ece_raw": round(ece_raw, 4),
            "ece_calibrated": round(ece_cal, 4),
            "confusion_matrix": {
                "tn": int(cm[0][0]),
                "fp": int(cm[0][1]),
                "fn": int(cm[1][0]),
                "tp": int(cm[1][1])
            }
        }
    }

    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[+] Saved model metadata to: {METADATA_FILE}")

    return model, calibrator, feature_cols, metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FinGuard Model Training & Evaluation")
    parser.add_argument("--evaluation-mode", choices=["temporal", "stratified"], default="temporal",
                        help="Evaluation mode: temporal (chronological split) or stratified")
    parser.add_argument("--feature-set", choices=["core", "extended"], default="core",
                        help="Feature set: core (23 features) or extended (38 features)")
    parser.add_argument("--calibrate", action="store_true", default=True,
                        help="Enable probability calibration (Platt scaling)")
    args = parser.parse_args()

    train_model(
        evaluation_mode=args.evaluation_mode,
        feature_set=args.feature_set,
        calibrate=args.calibrate
    )
