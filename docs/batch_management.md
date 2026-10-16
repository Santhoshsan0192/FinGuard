# FinGuard: Batch Management & Version Traceability

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

Destructive `delete_many({})` purging has been eliminated. The pipeline implements a non-destructive batch persistence engine where every execution creates a discrete batch document, generates an auto-incrementing ID, and links every scored record to that batch.

## 2. Batch Lifecycle

```
1. Ingest Batch Transactions
        ↓
2. Assign Auto-Incrementing Batch ID (e.g. BATCH-2026-0002)
        ↓
3. Extract Causal Features & Behavioral Deviations
        ↓
4. Load Model & Calibrator; Infer Risk Scores
        ↓
5. Generate Local & Global SHAP Attributions
        ↓
6. Upsert Customer & Behaviour Profiles (Active Snapshot)
        ↓
7. Non-Destructive Insert into transactions, risk_scores, alerts, explanations
        ↓
8. Write Batch Run Record to 'batches' Collection
```

## 3. MongoDB Collection Schema

1. **`batches`**: Master registry of batch runs. Contains `batch_id`, `model_version`, `dataset_version`, `started_at`, `completed_at`, `transaction_count`, `fraud_count`, `high_risk_count`, `medium_risk_count`, `low_risk_count`, `risk_thresholds`, `processing_time_seconds`, `status`, and `global_feature_importance`.
2. **`models`**: Tracks model versions, training timestamps, algorithms, and evaluation metrics.
3. **`customers`**: Upserted customer entities with contact and card metadata.
4. **`behaviour_profiles`**: Historical mean, standard deviation, active hours, and primary device baselines.
5. **`transactions`**: Raw and derived transaction attributes, indexed with `batch_id` and real timestamps.
6. **`risk_scores`**: Calibrated probability, raw probability, risk level, and `batch_id`.
7. **`alerts`**: Queue items for analyst triage, including `primary_risk_driver`, `cold_start_flag`, `status`, and `analyst_notes`.
8. **`explanations`**: SHAP decomposition records with `top_factors`, `positive_drivers`, and `negative_drivers`.

## 4. Database Secondary Indexes

The following indexes were initialized via `ml/init_db_indexes.py` and are active:
- **`alerts`**: `idx_alerts_batch_id`, `idx_alerts_risk_level`, `idx_alerts_status`, `idx_alerts_risk_score`, `idx_alerts_customer_id`
- **`transactions`**: `idx_transactions_cust_id`, `idx_transactions_batch_id`, `idx_transactions_dt`, `idx_transactions_created`
- **`risk_scores`**: `idx_scores_cust_id`, `idx_scores_batch_id`, `idx_scores_risk_level`, `idx_scores_risk_score`
- **`explanations`**: `idx_expl_tx_id`, `idx_expl_cust_id`, `idx_expl_batch_id`
- **`batches`**: `idx_batches_id_unique` (unique on `batch_id`), `idx_batches_started_at`
