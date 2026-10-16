"""
FinGuard - Feature Ablation Study Module
Executes 4 progressive feature ablation experiments using identical leakage-safe temporal splits:
- Experiment A: Transaction-only features
- Experiment B: Transaction + Behavioural baseline features
- Experiment C: Transaction + Behavioural + Velocity features (Core 23)
- Experiment D: Full FinGuard feature set (+ rolling windows, cold start, device changes)
Outputs results/ablation_study.csv and results/ablation_study.json.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe, CORE_23_FEATURES, EXTENDED_FEATURES

RESULTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "results"))

# Define feature subsets
EXP_A_FEATS = [
    "TransactionAmt", "hour_of_day", "day_of_week",
    "C1", "C2", "C4", "D1", "D2", "dist1",
    "ProductCD_enc", "card4_enc", "card6_enc", "DeviceType_enc"
]

EXP_B_FEATS = EXP_A_FEATS + [
    "baseline_avg_amt", "amt_to_baseline_ratio", "amt_zscore",
    "is_off_hours", "device_anomaly_flag"
]

EXP_C_FEATS = CORE_23_FEATURES  # Adds velocity & 24h rolling

EXP_D_FEATS = EXTENDED_FEATURES  # Adds cold start, 1h/6h rolling, device/card change flags


def run_ablation_study():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print("[*] Starting Feature Ablation Study (Leakage-Safe Temporal Evaluation)...")

    # 1. Load raw data and split chronologically (75% train, 25% test)
    df_raw = load_raw_dataset().sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
    total_tx = len(df_raw)
    cutoff = int(total_tx * 0.75)

    df_train_raw = df_raw.iloc[:cutoff].copy().reset_index(drop=True)
    df_test_raw = df_raw.iloc[cutoff:].copy().reset_index(drop=True)

    # 2. Engineer full extended feature sets causally
    df_train_feat, _, _ = engineer_features_leakage_safe(df_train_raw, feature_set="extended")
    df_test_feat, _, _ = engineer_features_leakage_safe(df_test_raw, prior_history_df=df_train_raw, feature_set="extended")

    y_train = df_train_feat["isFraud"].astype(int).values
    y_test = df_test_feat["isFraud"].astype(int).values

    train_fraud = int(np.sum(y_train))
    train_legit = len(y_train) - train_fraud
    scale_weight = min(4.0, float(train_legit) / float(max(1, train_fraud)))

    experiments = [
        ("Experiment A: Transaction-only", EXP_A_FEATS),
        ("Experiment B: Transaction + Behavioural", EXP_B_FEATS),
        ("Experiment C: Transaction + Behavioural + Velocity", EXP_C_FEATS),
        ("Experiment D: Full FinGuard Feature Set", EXP_D_FEATS)
    ]

    records = []
    print("\n" + "=" * 95)
    print(f"{'Experiment':<52} | {'Feats':<5} | {'Prec':<7} | {'Recall':<7} | {'F1':<7} | {'ROC_AUC':<8} | {'PR_AUC':<8}")
    print("-" * 95)

    for exp_name, feat_cols in experiments:
        X_train = df_train_feat[feat_cols].copy()
        X_test = df_test_feat[feat_cols].copy()

        model = xgb.XGBClassifier(
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
        model.fit(X_train, y_train)

        y_prob = model.predict_proba(X_test)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        acc = float(accuracy_score(y_test, y_pred))
        roc = float(roc_auc_score(y_test, y_prob))
        pr = float(average_precision_score(y_test, y_prob))
        cm = confusion_matrix(y_test, y_pred)

        record = {
            "Experiment": exp_name,
            "Feature_Count": len(feat_cols),
            "Precision": round(prec, 4),
            "Recall": round(rec, 4),
            "F1": round(f1, 4),
            "Accuracy": round(acc, 4),
            "ROC_AUC": round(roc, 4),
            "PR_AUC": round(pr, 4),
            "TN": int(cm[0][0]),
            "FP": int(cm[0][1]),
            "FN": int(cm[1][0]),
            "TP": int(cm[1][1])
        }
        records.append(record)

        print(f"{exp_name:<52} | {len(feat_cols):<5d} | {prec:<7.4f} | {rec:<7.4f} | {f1:<7.4f} | {roc:<8.4f} | {pr:<8.4f}")

    print("=" * 95 + "\n")

    df_results = pd.DataFrame(records)
    csv_path = os.path.join(RESULTS_DIR, "ablation_study.csv")
    json_path = os.path.join(RESULTS_DIR, "ablation_study.json")

    df_results[["Experiment", "Feature_Count", "Precision", "Recall", "F1", "ROC_AUC", "PR_AUC"]].to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(records, f, indent=2)

    print(f"[+] Successfully exported ablation study to:")
    print(f"    - {csv_path}")
    print(f"    - {json_path}")
    return df_results


if __name__ == "__main__":
    run_ablation_study()
