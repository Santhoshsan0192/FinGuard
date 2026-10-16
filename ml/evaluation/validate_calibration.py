"""
FinGuard - Scientific Probability Calibration Diagnostic & Validation
Deep inspection of calibration methodology, Brier score, ECE, Log Loss, and reliability diagrams.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score, average_precision_score

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe


def calculate_ece(y_true, y_prob, n_bins=10):
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


def run_calibration_validation():
    print("=" * 80)
    print("      FINGUARD PROBABILITY CALIBRATION SCIENTIFIC VALIDATION")
    print("=" * 80)

    # 1. Load dataset & sort chronologically
    df_raw = load_raw_dataset().sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
    total_tx = len(df_raw)
    cutoff = int(total_tx * 0.75)

    df_train_raw = df_raw.iloc[:cutoff].copy().reset_index(drop=True)
    df_test_raw = df_raw.iloc[cutoff:].copy().reset_index(drop=True)

    # 2. Leakage-safe feature extraction
    df_train_feat, _, feature_cols = engineer_features_leakage_safe(df_train_raw, feature_set="core")
    df_test_feat, _, _ = engineer_features_leakage_safe(df_test_raw, prior_history_df=df_train_raw, feature_set="core")

    X_train = df_train_feat[feature_cols].copy()
    y_train = df_train_feat["isFraud"].astype(int).values
    X_test = df_test_feat[feature_cols].copy()
    y_test = df_test_feat["isFraud"].astype(int).values

    print(f"[*] Train set: {len(X_train)} samples ({np.sum(y_train)} fraud, {len(y_train) - np.sum(y_train)} legit)")
    print(f"[*] Test set:  {len(X_test)} samples ({np.sum(y_test)} fraud, {len(y_test) - np.sum(y_test)} legit)")

    train_fraud = int(np.sum(y_train))
    train_legit = len(y_train) - train_fraud
    scale_weight = min(4.0, float(train_legit) / float(max(1, train_fraud)))

    # 3. Base XGBoost model
    base_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_lambda=2.0,
        scale_pos_weight=scale_weight,
        eval_metric="logloss",
        random_state=42
    )
    base_model.fit(X_train, y_train)

    raw_probs = base_model.predict_proba(X_test)[:, 1]

    # Calibration Variant 1: Platt Scaling (Sigmoid) with 3-fold CV on Train
    cal_cv3_sig = CalibratedClassifierCV(estimator=base_model, method="sigmoid", cv=3)
    cal_cv3_sig.fit(X_train, y_train)
    probs_cv3_sig = cal_cv3_sig.predict_proba(X_test)[:, 1]

    # Calibration Variant 2: Isotonic Regression with 3-fold CV on Train
    cal_cv3_iso = CalibratedClassifierCV(estimator=base_model, method="isotonic", cv=3)
    cal_cv3_iso.fit(X_train, y_train)
    probs_cv3_iso = cal_cv3_iso.predict_proba(X_test)[:, 1]

    # Calibration Variant 3: 5-fold CV on Train
    cal_cv5_sig = CalibratedClassifierCV(estimator=base_model, method="sigmoid", cv=5)
    cal_cv5_sig.fit(X_train, y_train)
    probs_cv5_sig = cal_cv5_sig.predict_proba(X_test)[:, 1]

    # Calibration Variant 4: Chronological Holdout Split (train 80% of train, calibrate on last 20% of train)
    val_split_idx = int(len(X_train) * 0.8)
    train_indices = np.arange(0, val_split_idx)
    val_indices = np.arange(val_split_idx, len(X_train))
    custom_cv = [(train_indices, val_indices)]

    cal_holdout_sig = CalibratedClassifierCV(estimator=base_model, method="sigmoid", cv=custom_cv)
    cal_holdout_sig.fit(X_train, y_train)
    probs_holdout_sig = cal_holdout_sig.predict_proba(X_test)[:, 1]

    variants = [
        ("Raw XGBoost Probabilities", raw_probs),
        ("Calibrated: Platt Sigmoid (3-Fold CV on Train)", probs_cv3_sig),
        ("Calibrated: Platt Sigmoid (5-Fold CV on Train)", probs_cv5_sig),
        ("Calibrated: Isotonic Regression (3-Fold CV on Train)", probs_cv3_iso),
        ("Calibrated: Platt Sigmoid (Chronological Train/Val Holdout)", probs_holdout_sig)
    ]

    print("\n" + "-" * 95)
    print(f"{'Method / Variant':<58} | {'Brier':<8} | {'ECE':<8} | {'LogLoss':<8} | {'PR-AUC':<8}")
    print("-" * 95)

    results_data = []
    for name, p in variants:
        brier = float(brier_score_loss(y_test, p))
        ece = float(calculate_ece(y_test, p, n_bins=10))
        ll = float(log_loss(y_test, p))
        pr = float(average_precision_score(y_test, p))

        results_data.append({
            "method": name,
            "brier_score": round(brier, 4),
            "ece": round(ece, 4),
            "log_loss": round(ll, 4),
            "pr_auc": round(pr, 4)
        })
        print(f"{name:<58} | {brier:<8.4f} | {ece:<8.4f} | {ll:<8.4f} | {pr:<8.4f}")

    print("-" * 95 + "\n")

    # Reliability Diagram (Binned confidence vs observed fraud frequency)
    print("[*] Reliability Diagram Analysis (Raw vs 3-Fold Platt):")
    fraction_of_positives_raw, mean_predicted_value_raw = calibration_curve(y_test, raw_probs, n_bins=5, strategy="uniform")
    fraction_of_positives_cal, mean_predicted_value_cal = calibration_curve(y_test, probs_cv3_sig, n_bins=5, strategy="uniform")

    print("\n  Raw XGBoost Calibration Curve (5 bins):")
    for pred, obs in zip(mean_predicted_value_raw, fraction_of_positives_raw):
        print(f"    Predicted Confidence: {pred:6.3f} | Observed Fraction: {obs:6.3f} | Delta: {abs(pred - obs):6.3f}")

    print("\n  Platt Calibrated Curve (5 bins):")
    for pred, obs in zip(mean_predicted_value_cal, fraction_of_positives_cal):
        print(f"    Predicted Confidence: {pred:6.3f} | Observed Fraction: {obs:6.3f} | Delta: {abs(pred - obs):6.3f}")

    # Probability Spread Statistics
    print("\n[*] Probability Distribution Statistics on Untouched Test Set (550 samples):")
    print(f"  Raw Probs:        min={np.min(raw_probs):.4f}, median={np.median(raw_probs):.4f}, mean={np.mean(raw_probs):.4f}, max={np.max(raw_probs):.4f}")
    print(f"  Platt Calibrated: min={np.min(probs_cv3_sig):.4f}, median={np.median(probs_cv3_sig):.4f}, mean={np.mean(probs_cv3_sig):.4f}, max={np.max(probs_cv3_sig):.4f}")
    print(f"  Number of test instances with Raw Prob >= 0.50:        {np.sum(raw_probs >= 0.5)} (True Positives: {np.sum((raw_probs >= 0.5) & (y_test == 1))})")
    print(f"  Number of test instances with Calibrated Prob >= 0.50:   {np.sum(probs_cv3_sig >= 0.5)} (True Positives: {np.sum((probs_cv3_sig >= 0.5) & (y_test == 1))})")

    out_file = os.path.join(os.path.dirname(__file__), "..", "..", "results", "calibration_validation.json")
    with open(out_file, "w") as f:
        json.dump(results_data, f, indent=2)
    print(f"\n[+] Saved calibration validation to: {out_file}")


if __name__ == "__main__":
    run_calibration_validation()
