"""
FinGuard - Unified Batch Machine Learning & Scoring Pipeline
Executes end-to-end FinGuard workflow:
  1. Data Loading / IEEE-CIS dataset ingestion
  2. Customer Behaviour Baseline computation (leakage-safe)
  3. XGBoost model training (Temporal evaluation by default)
  4. Platt scaling probability calibration
  5. PR-AUC, ROC-AUC, Brier score, and ECE evaluation
  6. SHAP TreeExplainer generation for all transactions
  7. Non-destructive batch persistence to MongoDB:
     batches, models, customers, transactions, behaviour_profiles,
     risk_scores, alerts, explanations
"""

import sys
import os
import time
import argparse
import pymongo

sys.path.insert(0, os.path.dirname(__file__))

from train import train_model
from batch_scorer import score_batch


def main():
    parser = argparse.ArgumentParser(description="FinGuard Unified Pipeline")
    parser.add_argument("--evaluation-mode", choices=["temporal", "stratified"], default="temporal",
                        help="Evaluation mode for train/test split (default: temporal)")
    parser.add_argument("--feature-set", choices=["core", "extended"], default="core",
                        help="Feature set to use: core (23) or extended (38)")
    args = parser.parse_args()

    start_time = time.time()
    print("=" * 70)
    print("      FinGuard - EXPLAINABLE FRAUD RISK SCORING PIPELINE")
    print("=" * 70)

    # Step 1: Train model & print evaluation metrics
    print(f"\n>>> [STEP 1] Training Model ({args.evaluation_mode.upper()} mode, {args.feature_set.upper()} features)...")
    model, calibrator, feature_cols, metadata = train_model(
        evaluation_mode=args.evaluation_mode,
        feature_set=args.feature_set,
        calibrate=True
    )

    # Step 2: Run batch scorer with SHAP explanations & non-destructive MongoDB push
    print("\n>>> [STEP 2] Running Batch Scorer & Computing SHAP Explanations...")
    batch_summary = score_batch()

    # Step 3: Verification
    print("\n>>> [STEP 3] Verifying MongoDB Collections & Active Batch...")
    client = pymongo.MongoClient("mongodb://localhost:27017/")
    db = client["finguard"]

    active_batch_id = batch_summary["batch_id"]
    sample_alert = db["alerts"].find_one({"batch_id": active_batch_id, "risk_level": "HIGH"})
    if not sample_alert:
        sample_alert = db["alerts"].find_one({"batch_id": active_batch_id})

    sample_expl = db["explanations"].find_one({
        "transaction_id": sample_alert["transaction_id"],
        "batch_id": active_batch_id
    })

    print("-" * 70)
    print(f"Sample Scored Alert for Batch {active_batch_id}:")
    print(f"  Alert ID:        {sample_alert.get('alert_id')}")
    print(f"  Customer ID:     {sample_alert.get('customer_id')}")
    print(f"  Amount:          ${sample_alert.get('amount'):,.2f}")
    print(f"  Risk Score:      {sample_alert.get('risk_score')} ({sample_alert.get('risk_level')})")
    print(f"  Primary Driver:  {sample_alert.get('primary_risk_driver')}")
    print(f"  Status:          {sample_alert.get('status')}")
    if sample_expl:
        print("\nAttached SHAP Top Factors:")
        for idx, factor in enumerate(sample_expl.get("top_factors", [])[:4], 1):
            print(f"  {idx}. [{factor['impact']}] {factor['description']} (SHAP: {factor['shap_value']:+.4f})")
    print("-" * 70)

    elapsed = time.time() - start_time
    print(f"\n[SUCCESS] Pipeline executed successfully in {elapsed:.2f} seconds!")
    print("=" * 70)


if __name__ == "__main__":
    main()
