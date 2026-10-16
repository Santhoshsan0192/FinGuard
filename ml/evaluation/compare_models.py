"""
FinGuard - Baseline Model Comparison Module
Evaluates Logistic Regression, Random Forest, and XGBoost using identical leakage-safe temporal splits.
Outputs results/model_comparison.csv and results/model_comparison.json.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)
import xgboost as xgb

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe

RESULTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "results"))


def run_model_comparison(evaluation_mode="temporal"):
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print(f"[*] Starting Baseline Model Comparison (Mode: {evaluation_mode.upper()})...")

    # 1. Load dataset & sort chronologically
    df_raw = load_raw_dataset().sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
    total_tx = len(df_raw)

    if evaluation_mode == "temporal":
        cutoff_idx = int(total_tx * 0.75)
        df_train_raw = df_raw.iloc[:cutoff_idx].copy().reset_index(drop=True)
        df_test_raw = df_raw.iloc[cutoff_idx:].copy().reset_index(drop=True)
    else:
        from sklearn.model_selection import train_test_split
        train_idx, test_idx = train_test_split(
            np.arange(total_tx), test_size=0.25, random_state=42, stratify=df_raw["isFraud"]
        )
        df_train_raw = df_raw.iloc[train_idx].sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
        df_test_raw = df_raw.iloc[test_idx].sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

    # 2. Leakage-safe feature extraction
    df_train, _, feature_cols = engineer_features_leakage_safe(df_train_raw, feature_set="core")
    df_test, _, _ = engineer_features_leakage_safe(df_test_raw, prior_history_df=df_train_raw, feature_set="core")

    X_train = df_train[feature_cols].copy()
    y_train = df_train["isFraud"].astype(int).values
    X_test = df_test[feature_cols].copy()
    y_test = df_test["isFraud"].astype(int).values

    # Imbalance ratio
    train_fraud = int(np.sum(y_train))
    train_legit = len(y_train) - train_fraud
    scale_weight = float(train_legit) / float(max(1, train_fraud))

    # Standard scale for linear models
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Define candidate models
    models = {
        "Logistic Regression": {
            "model": LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=42,
                solver="lbfgs"
            ),
            "use_scaled": True
        },
        "Random Forest": {
            "model": RandomForestClassifier(
                n_estimators=100,
                max_depth=6,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1
            ),
            "use_scaled": False
        },
        "XGBoost (FinGuard)": {
            "model": xgb.XGBClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.06,
                subsample=0.85,
                colsample_bytree=0.85,
                reg_lambda=2.0,
                scale_pos_weight=min(4.0, scale_weight),
                eval_metric="logloss",
                random_state=42
            ),
            "use_scaled": False
        }
    }

    comparison_records = []
    print("\n" + "=" * 80)
    print(f"{'Model':<24} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'ROC_AUC':<10} | {'PR_AUC':<10}")
    print("-" * 80)

    for name, item in models.items():
        clf = item["model"]
        Xt = X_train_scaled if item["use_scaled"] else X_train
        Xv = X_test_scaled if item["use_scaled"] else X_test

        clf.fit(Xt, y_train)

        # Probabilities and predictions
        y_prob = clf.predict_proba(Xv)[:, 1]
        y_pred = (y_prob >= 0.5).astype(int)

        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))
        acc = float(accuracy_score(y_test, y_pred))
        roc = float(roc_auc_score(y_test, y_prob))
        pr = float(average_precision_score(y_test, y_prob))
        cm = confusion_matrix(y_test, y_pred)

        record = {
            "Model": name,
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
        comparison_records.append(record)

        print(f"{name:<24} | {prec:<10.4f} | {rec:<10.4f} | {f1:<10.4f} | {roc:<10.4f} | {pr:<10.4f}")

    print("=" * 80 + "\n")

    # Save to CSV and JSON
    df_results = pd.DataFrame(comparison_records)
    csv_path = os.path.join(RESULTS_DIR, "model_comparison.csv")
    final_temporal_csv_path = os.path.join(RESULTS_DIR, "final_temporal_model_comparison.csv")
    json_path = os.path.join(RESULTS_DIR, "model_comparison.json")

    cols = ["Model", "Precision", "Recall", "F1", "Accuracy", "ROC_AUC", "PR_AUC", "TN", "FP", "FN", "TP"]
    df_results[cols].to_csv(final_temporal_csv_path, index=False)
    df_results[["Model", "Precision", "Recall", "F1", "ROC_AUC", "PR_AUC"]].to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(comparison_records, f, indent=2)

    print(f"[+] Successfully exported model comparison to:")
    print(f"    - {csv_path}")
    print(f"    - {final_temporal_csv_path}")
    print(f"    - {json_path}")
    return df_results


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "temporal"
    run_model_comparison(evaluation_mode=mode)
