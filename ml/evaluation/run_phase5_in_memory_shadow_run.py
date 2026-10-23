"""
FinGuard Phase 5 - In-Memory Shadow Run
Executes an isolated 397-feature behavioural batch scoring run on a fixed, reproducible
batch of 1,000 transactions from the IEEE-CIS validation partition.

Safety & Constraints:
- Uses trained model and matching feature catalog in ml/kaggle_prototype/
- Validates all 392 required base raw columns + TransactionID
- Uses only historically preceding records (train partition) to construct behavioural features
- Does not retrain either model
- Runs with save_to_db=False
- Zero MongoDB connection
- Zero modifications to production models, calibrator, backend, frontend, or datasets
- Verifies transaction IDs, prediction count, risk-score bounds, alert thresholds,
  explanation schemas, and calibration metadata
- Compares predictions against saved Kaggle validation predictions
"""

import os
import sys
import time
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd

# Path setup
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PROTOTYPE_DIR = os.path.join(BASE_DIR, "ml", "kaggle_prototype")
sys.path.insert(0, PROTOTYPE_DIR)

from input_validator import validate_raw_transaction_input, get_required_raw_columns
from behavioural_batch_scorer import BehaviouralBatchScorer, BatchExecutionResult

DATA_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "ieee-fraud-detection")
TRANSACTION_CSV = os.path.join(DATA_DIR, "train_transaction.csv")
KAGGLE_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "finguard_results")
KAGGLE_PREDS_CSV = os.path.join(KAGGLE_DIR, "validation_predictions.csv")


def run_phase5_shadow_batch():
    t_start_total = time.time()
    failures = []
    checks = {}

    print("=" * 80)
    print("      FINGUARD PHASE 5: IN-MEMORY SHADOW RUN (1,000 BATCH)")
    print("=" * 80)

    # 1. Validate environment & paths
    print("\n>>> [1/6] Validating Environment & Artifacts...")
    for p, name in [
        (TRANSACTION_CSV, "Full IEEE-CIS train_transaction.csv"),
        (KAGGLE_PREDS_CSV, "Kaggle validation_predictions.csv"),
        (os.path.join(PROTOTYPE_DIR, "behavioural_xgboost.json"), "Kaggle Behavioural Model"),
        (os.path.join(PROTOTYPE_DIR, "feature_columns.json"), "397-Feature Catalog")
    ]:
        exists = os.path.exists(p)
        print(f"  [{'+' if exists else '!'}] {name}: {'FOUND' if exists else 'MISSING'} ({p})")
        if not exists:
            failures.append(f"Missing artifact: {name} at {p}")

    if failures:
        print("\n[!] Aborting due to missing artifacts.")
        return False, failures, checks

    # 2. Ingest raw IEEE-CIS dataset and slice fixed 1,000 validation batch
    print("\n>>> [2/6] Loading IEEE-CIS Dataset and Constructing Reproducible Partition...")
    t0 = time.time()
    df_raw = pd.read_csv(TRANSACTION_CSV)
    df_raw = df_raw.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
    load_time = time.time() - t0
    print(f"  [+] Loaded and chronologically sorted {len(df_raw):,} records in {load_time:.2f}s")

    # Chronological partition definition:
    # Rows 0 to 472,431 = Training partition (historically preceding records)
    # Rows 472,432 to 590,539 = Validation partition (118,108 records)
    train_count = 472432
    batch_size = 1000

    prior_history_df = df_raw.iloc[:train_count].copy().reset_index(drop=True)
    batch_raw = df_raw.iloc[train_count:train_count + batch_size].copy().reset_index(drop=True)

    print(f"  [+] Historical Preceding Baseline: {len(prior_history_df):,} records (indices 0 to {train_count - 1})")
    print(f"  [+] Evaluation Batch:              {len(batch_raw):,} records (indices {train_count} to {train_count + batch_size - 1})")

    # 3. Validate input schema on evaluation batch
    print("\n>>> [3/6] Schema & Column Validation on Input Batch...")
    try:
        is_valid, missing_cols = validate_raw_transaction_input(batch_raw, require_transaction_id=True)
        required_raw = get_required_raw_columns()
        print(f"  [+] Schema Validation Passed:      {is_valid}")
        print(f"  [+] Required Base Columns Count:   {len(required_raw)} (plus TransactionID)")
        print(f"  [+] Batch Column Count:            {len(batch_raw.columns)}")
        print(f"  [+] Missing Required Columns:      {len(missing_cols)}")
        checks["schema_validation"] = {
            "passed": is_valid,
            "required_columns_count": len(required_raw) + 1,
            "missing_columns_count": len(missing_cols)
        }
    except Exception as e:
        failures.append(f"Schema validation error: {str(e)}")
        checks["schema_validation"] = {"passed": False, "error": str(e)}

    # Verify temporal strict causality
    max_prior_dt = prior_history_df["TransactionDT"].iloc[-1]
    min_batch_dt = batch_raw["TransactionDT"].iloc[0]
    causality_valid = (max_prior_dt < min_batch_dt)
    print(f"  [+] Temporal Separation Check:     Latest Prior DT={max_prior_dt} < Earliest Batch DT={min_batch_dt} -> {causality_valid}")
    checks["causal_temporal_separation"] = {
        "max_prior_dt": int(max_prior_dt),
        "min_batch_dt": int(min_batch_dt),
        "strictly_causal": bool(causality_valid)
    }
    if not causality_valid:
        failures.append("Temporal causality violation between prior_history_df and batch_raw.")

    # 4. Execute isolated batch scorer
    print("\n>>> [4/6] Executing Isolated Behavioural Batch Scorer...")
    scorer = BehaviouralBatchScorer(low_threshold=40.0, high_threshold=75.0)

    t_score_start = time.time()
    batch_id = "SHADOW-PHASE5-BATCH-0001"
    
    result = scorer.score_batch(
        df_raw=batch_raw,
        prior_history_df=prior_history_df,
        batch_id=batch_id,
        compute_shap=True,
        save_to_db=False
    )
    score_elapsed = time.time() - t_score_start
    print(f"  [+] Scored {result.transaction_count} transactions in {score_elapsed:.2f}s ({result.throughput_tx_sec:.1f} tx/s)")

    # 5. Comprehensive verifications
    print("\n>>> [5/6] Verifying Constraints, Schemas, & Invariants...")

    # (a) Transaction IDs
    tx_ids = [doc["transaction_id"] for doc in result.transaction_documents]
    expected_start_id = int(batch_raw["TransactionID"].iloc[0])
    expected_end_id = int(batch_raw["TransactionID"].iloc[-1])
    id_start_match = (tx_ids[0] == 3459432 and tx_ids[0] == expected_start_id)
    id_end_match = (tx_ids[-1] == 3460431 and tx_ids[-1] == expected_end_id)
    id_monotonic = bool((np.diff(tx_ids) > 0).all())
    id_contiguous = bool((np.diff(tx_ids) == 1).all())

    print(f"  [+] Transaction ID Range:          {tx_ids[0]} -> {tx_ids[-1]}")
    print(f"  [+] ID Alignment:                  Start match: {id_start_match}, End match: {id_end_match}")
    print(f"  [+] ID Monotonic & Contiguous:     Monotonic={id_monotonic}, Contiguous={id_contiguous}")
    checks["transaction_ids"] = {
        "start_id": tx_ids[0],
        "end_id": tx_ids[-1],
        "expected_start": 3459432,
        "expected_end": 3460431,
        "monotonic": id_monotonic,
        "contiguous": id_contiguous,
        "count": len(tx_ids)
    }

    # (b) Prediction count
    pred_count = len(result.raw_probabilities)
    print(f"  [+] Prediction Count:              {pred_count} (Expected: 1,000)")
    checks["prediction_count"] = {"count": pred_count, "expected": 1000, "match": pred_count == 1000}
    if pred_count != 1000:
        failures.append(f"Prediction count mismatch: {pred_count} != 1000")

    # (c) Risk-score bounds
    min_score = float(np.min(result.risk_scores))
    max_score = float(np.max(result.risk_scores))
    mean_score = float(np.mean(result.risk_scores))
    median_score = float(np.median(result.risk_scores))
    bounds_valid = (min_score >= 0.0 and max_score <= 100.0)
    print(f"  [+] Risk Score Distribution:       Min={min_score:.1f}, Max={max_score:.1f}, Mean={mean_score:.2f}, Median={median_score:.1f}")
    print(f"  [+] Risk Score Bounds Valid:       {bounds_valid} [0.0, 100.0]")
    checks["risk_score_bounds"] = {
        "min": min_score,
        "max": max_score,
        "mean": mean_score,
        "median": median_score,
        "within_0_100": bounds_valid
    }
    if not bounds_valid:
        failures.append(f"Risk scores out of bounds: [{min_score}, {max_score}]")

    # (d) Alert thresholds & counts
    high_count = result.high_risk_count
    med_count = result.medium_risk_count
    low_count = result.low_risk_count
    alert_doc_count = len(result.alert_documents)
    expected_alerts = high_count + med_count
    alert_match = (alert_doc_count == expected_alerts)
    print(f"  [+] Severity Breakdown:            HIGH={high_count}, MEDIUM={med_count}, LOW={low_count} (Total={high_count+med_count+low_count})")
    print(f"  [+] Alerts Generated:              {alert_doc_count} (HIGH + MEDIUM: {expected_alerts}) -> Match: {alert_match}")
    checks["alert_thresholds"] = {
        "low_threshold": result.batch_document["risk_thresholds"]["low_threshold"],
        "high_threshold": result.batch_document["risk_thresholds"]["high_threshold"],
        "high_risk_count": high_count,
        "medium_risk_count": med_count,
        "low_risk_count": low_count,
        "alert_documents_count": alert_doc_count,
        "alerts_match_expected": alert_match
    }
    if not alert_match:
        failures.append(f"Alert count mismatch: {alert_doc_count} != {expected_alerts}")

    # (e) Explanation schemas
    expl_doc_count = len(result.explanation_documents)
    expl_count_match = (expl_doc_count == 1000)
    sample_expl = result.explanation_documents[0] if result.explanation_documents else {}
    required_expl_keys = {"_id", "transaction_id", "batch_id", "customer_id", "base_value", "top_factors", "positive_drivers", "negative_drivers", "primary_risk_driver", "generated_at"}
    expl_schema_valid = required_expl_keys.issubset(sample_expl.keys())
    top_factors_valid = True
    if sample_expl.get("top_factors"):
        factor_keys = {"feature", "value", "shap_value", "impact", "description"}
        top_factors_valid = factor_keys.issubset(sample_expl["top_factors"][0].keys())

    print(f"  [+] Explanations Count:            {expl_doc_count} (Expected: 1,000)")
    print(f"  [+] Explanation Doc Schema:        {'VALID' if expl_schema_valid else 'INVALID'}")
    print(f"  [+] TopFactor Item Schema:         {'VALID' if top_factors_valid else 'INVALID'}")
    checks["explanation_schemas"] = {
        "explanations_count": expl_doc_count,
        "doc_schema_valid": expl_schema_valid,
        "top_factor_schema_valid": top_factors_valid,
        "sample_primary_driver": sample_expl.get("primary_risk_driver")
    }
    if not expl_schema_valid or not top_factors_valid:
        failures.append("Explanation document or TopFactor item schema failed validation.")

    # (f) Calibration metadata
    batch_calib_method = result.batch_document.get("calibration_method")
    batch_is_calibrated = result.batch_document.get("is_calibrated")
    score_doc_calib = result.risk_score_documents[0]
    score_calib_method = score_doc_calib.get("calibration_method")
    score_is_calibrated = score_doc_calib.get("is_calibrated")
    probs_mirrored = all(doc["raw_probability"] == doc["calibrated_probability"] for doc in result.risk_score_documents)

    calib_meta_valid = (
        batch_calib_method == "NONE_RAW_MIRROR" and
        batch_is_calibrated is False and
        score_calib_method == "NONE_RAW_MIRROR" and
        score_is_calibrated is False and
        probs_mirrored
    )
    print(f"  [+] Calibration Metadata:          Method='{batch_calib_method}', is_calibrated={batch_is_calibrated}, Probs Mirrored={probs_mirrored}")
    print(f"  [+] Calibrator Bypassed Guard:     {'VERIFIED' if calib_meta_valid else 'FAILED'}")
    checks["calibration_metadata"] = {
        "batch_calibration_method": batch_calib_method,
        "batch_is_calibrated": batch_is_calibrated,
        "score_calibration_method": score_calib_method,
        "score_is_calibrated": score_is_calibrated,
        "calibrated_prob_mirrors_raw": probs_mirrored,
        "valid": calib_meta_valid
    }
    if not calib_meta_valid:
        failures.append("Calibration metadata verification failed.")

    # 6. Compare predictions with saved Kaggle validation predictions
    print("\n>>> [6/6] Numerical Parity Check with Saved Kaggle Validation Predictions...")
    val_pred_df = pd.read_csv(KAGGLE_PREDS_CSV)
    kaggle_batch_preds = val_pred_df["behavioural_probability"].iloc[:batch_size].values

    abs_diffs = np.abs(result.raw_probabilities - kaggle_batch_preds)
    max_diff = float(np.max(abs_diffs))
    mean_diff = float(np.mean(abs_diffs))
    exact_matches_1e5 = int(np.sum(abs_diffs < 1e-5))
    exact_matches_1e7 = int(np.sum(abs_diffs < 1e-7))

    print(f"  [+] Max Absolute Difference:       {max_diff:.8e}")
    print(f"  [+] Mean Absolute Difference:      {mean_diff:.8e}")
    print(f"  [+] Matches (< 1e-5):              {exact_matches_1e5} / {batch_size} ({exact_matches_1e5/batch_size*100:.1f}%)")
    print(f"  [+] Matches (< 1e-7):              {exact_matches_1e7} / {batch_size} ({exact_matches_1e7/batch_size*100:.1f}%)")
    print(f"  [+] Machine-Precision Parity:      {'PASSED (< 1e-5 across 100%)' if exact_matches_1e5 == batch_size else 'FAILED'}")

    checks["kaggle_parity"] = {
        "max_abs_diff": max_diff,
        "mean_abs_diff": mean_diff,
        "matches_tol_1e5": exact_matches_1e5,
        "matches_tol_1e7": exact_matches_1e7,
        "total_compared": batch_size,
        "parity_passed": bool(exact_matches_1e5 == batch_size)
    }
    if exact_matches_1e5 != batch_size:
        failures.append(f"Parity mismatch with saved Kaggle predictions: {exact_matches_1e5} / {batch_size} matched within 1e-5.")

    total_time = round(time.time() - t_start_total, 2)
    print("\n" + "=" * 80)
    print(f"  TOTAL RUNTIME: {total_time:.2f}s | FAILURES: {len(failures)}")
    print("=" * 80)

    summary = {
        "status": "SUCCESS" if len(failures) == 0 else "FAILED",
        "batch_id": batch_id,
        "model_version": result.model_version,
        "dataset_version": result.batch_document["dataset_version"],
        "transaction_count": result.transaction_count,
        "runtimes": {
            "dataset_load_sort_sec": round(load_time, 2),
            "batch_scoring_sec": round(score_elapsed, 2),
            "total_elapsed_sec": total_time,
            "throughput_tx_sec": result.throughput_tx_sec
        },
        "breakdown": {
            "fraud_ground_truth": result.fraud_count,
            "high_risk": result.high_risk_count,
            "medium_risk": result.medium_risk_count,
            "low_risk": result.low_risk_count,
            "alerts_generated": len(result.alert_documents),
            "explanations_generated": len(result.explanation_documents)
        },
        "checks": checks,
        "failures": failures
    }

    return len(failures) == 0, failures, summary


if __name__ == "__main__":
    success, failures, summary = run_phase5_shadow_batch()
    # Save concise shadow run report to results/shadow/phase5_shadow_run_summary.json
    results_dir = os.path.join(BASE_DIR, "results", "shadow")
    os.makedirs(results_dir, exist_ok=True)
    summary_path = os.path.join(results_dir, "phase5_shadow_run_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\n[+] Saved concise summary JSON to: {summary_path}")
    sys.exit(0 if success else 1)
