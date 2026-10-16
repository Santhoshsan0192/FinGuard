# FinGuard: Journal Evidence & Empirical Verification Report

**Project Title:** FinGuard: Explainable AI-Driven Risk Scoring for Fraud Analyst Decision Support  
**Document Type:** Empirical Technical Evidence Report for Academic / Journal Publication  
**Verification Date:** October 2026  
**Execution Environment:** Windows 11, OpenJDK 17.0.18, Python 3.11.16, MongoDB 8.3.7  
**Guiding Principle:** Strict zero fabrication. Every metric, latency, and distribution reported below was empirically obtained by executing the repository implementation.

---

## 1. Dataset Specification

- **Benchmark Source:** IEEE-CIS Fraud Detection benchmark dataset subset (`ml/data/train_transaction.csv`, `ml/data/train_identity.csv`)
- **Total Transactions:** 2,200
- **Total Unique Customers:** 120
- **Fraudulent Transactions:** 132 (6.00%)
- **Legitimate Transactions:** 2,068 (94.00%)
- **Class Imbalance Ratio:** 15.67 : 1
- **Source Verification:** `ml/data_loader.py` load routine execution output

---

## 2. Dataset Splitting & Temporal Partitioning

- **Evaluation Methodology:** Chronological temporal partition (75% historical training / 25% future out-of-time testing)
- **Chronological Cutoff Threshold:** `TransactionDT` = 1,879,867
- **Training Period:** `TransactionDT` [3,969 – 1,879,867] (~21.7 days span)
- **Testing Period:** `TransactionDT` [1,881,234 – 2,503,164] (~7.2 days span)
- **Training Set Count:** 1,650 transactions (Fraud: 92 [5.58%], Legitimate: 1,558 [94.42%])
- **Testing Set Count:** 550 transactions (Fraud: 40 [7.27%], Legitimate: 510 [92.73%])
- **Comparative Baseline (Stratified Random Split):** 1,650 train (99 fraud, 1,551 legit), 550 test (33 fraud, 517 legit)
- **Source Verification:** `ml/models/model_metadata.json`, `ml/train.py` console output

---

## 3. Feature Count & Definitions

- **Core Feature Count:** 23 features (`ml/models/features.json`)
- **Extended Feature Catalog:** 38 features (`ml/features.py`)
- **Core 23 Features:**
  1. `TransactionAmt`: Transaction amount in USD
  2. `amt_to_baseline_ratio`: Ratio of current amount to causal customer mean
  3. `amt_zscore`: Z-score deviation from customer historical standard deviation
  4. `velocity_hours_since_last_tx`: Elapsed hours since previous customer transaction
  5. `velocity_rapid_tx_flag`: Binary indicator for rapid transaction (< 15 mins)
  6. `is_off_hours`: Binary indicator for activity outside customer 10th-90th percentile active hours
  7. `tx_freq_24h`: Trailing 24-hour customer transaction count
  8. `amt_sum_24h`: Trailing 24-hour cumulative spend sum ($)
  9. `spend_24h_to_baseline_ratio`: Ratio of 24h spend to historical average spend
  10. `device_anomaly_flag`: Binary indicator if current device differs from customer primary device
  11. `hour_of_day`: Hour index [0 – 23]
  12. `day_of_week`: Day index [0 – 6]
  13. `baseline_avg_amt`: Causal historical average spend
  14. `C1`: Counting metric 1
  15. `C2`: Frequency counting metric 2
  16. `C4`: Counting metric 4
  17. `D1`: Timedelta metric 1 (days since prior event)
  18. `D2`: Timedelta metric 2
  19. `dist1`: Distance from registered address (miles)
  20. `ProductCD_enc`: Product category deterministic mapping (0–4)
  21. `card4_enc`: Card brand deterministic mapping (0–3)
  22. `card6_enc`: Card type deterministic mapping (0–1)
  23. `DeviceType_enc`: Device type deterministic mapping (0–1)
- **Source Verification:** `ml/models/features.json`, `ml/features.py`

---

## 4. Behavioural Profiling & Data Leakage Prevention

- **Causality Enforcement:** Baselines ($\mu$, $\sigma$, median, active hours, primary device, rolling windows) are computed sequentially per customer. For transaction $t_i$, only transactions $t_j < t_i$ are included.
- **Cold-Start Protocol:** Customers with 0 prior transactions have `cold_start_customer_flag = 1`, `customer_transaction_count = 0`, and inherit population baseline parameters ($\mu_{\text{pop}} = \$135.00, \sigma_{\text{pop}} = \$100.00$).
- **Automated Leakage Test:** `ml/tests/test_no_data_leakage.py` ran 4 tests in 0.060s — **PASSED**. Future $500 outlier transactions did not alter prior baselines.

---

## 5. Model Configurations

### Main FinGuard Model (XGBoost)
- **Algorithm:** XGBoost Classifier (`xgboost.XGBClassifier`)
- **Objective:** `binary:logistic`
- **n_estimators:** 100
- **max_depth:** 4
- **learning_rate:** 0.06
- **subsample:** 0.85
- **colsample_bytree:** 0.85
- **reg_lambda:** 2.0
- **scale_pos_weight:** 4.0 (calibrated against 16.9:1 raw ratio to avoid probability saturation)
- **eval_metric:** `logloss`
- **random_state:** 42
- **Persistence:** Native JSON (`ml/models/finguard_xgb.json`) — Pickle strictly forbidden.

### Baseline Models
1. **Logistic Regression:** `LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42, solver='lbfgs')` with `StandardScaler`
2. **Random Forest:** `RandomForestClassifier(n_estimators=100, max_depth=6, class_weight='balanced', random_state=42, n_jobs=-1)`

---

## 6. Empirical Model Comparison Results (Temporal Out-of-Time Split)

*Source Artifact:* `results/model_comparison.csv`

| Model | Precision | Recall | F1-Score | Accuracy | ROC-AUC | PR-AUC | TN | FP | FN | TP |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | 0.8298 | **0.9750** | 0.8966 | 0.9818 | 0.9966 | 0.9659 | 502 | 8 | 1 | 39 |
| **Random Forest** | 0.9070 | **0.9750** | **0.9398** | **0.9909** | **0.9977** | **0.9685** | 506 | 4 | 1 | 39 |
| **XGBoost (FinGuard)** | **0.9231** | 0.9000 | 0.9114 | 0.9873 | 0.9975 | 0.9668 | 507 | 3 | 4 | 36 |

### Findings:
- XGBoost achieved the **highest Precision (0.9231)**, minimizing analyst false-positive alerts to just 3 cases in the test set.
- Random Forest achieved the highest F1-Score ($0.9398$) with $0.9750$ Recall.
- All models achieved PR-AUC $\ge 0.9659$ and ROC-AUC $\ge 0.9966$.

---

## 7. Probability Calibration Verification

- **Method:** Platt Scaling (Sigmoid) via 3-fold cross validation (`CalibratedClassifierCV`) fit strictly on training data
- **Raw Brier Score:** 0.0108
- **Calibrated Brier Score:** 0.0118
- **Raw Expected Calibration Error (ECE):** 0.0116
- **Calibrated Expected Calibration Error (ECE):** 0.0129
- **Risk Score Derivation:** $\text{RiskScore} = \text{round}(\text{calibrated\_probability} \times 100, 1)$
- **Source Verification:** `ml/train.py` execution output, `ml/models/model_metadata.json`

---

## 8. Feature Ablation Study Results

*Source Artifact:* `results/ablation_study.csv`

| Experiment | Feature Subset | Feat Count | Precision | Recall | F1-Score | ROC-AUC | PR-AUC |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp A** | Transaction-only features | 13 | 0.9211 | 0.8750 | 0.8974 | 0.9953 | 0.9441 |
| **Exp B** | Transaction + Behavioural baselines | 18 | 0.9000 | 0.9000 | 0.9000 | 0.9972 | 0.9613 |
| **Exp C** | Transaction + Behavioural + Velocity | 23 | **0.9231** | **0.9000** | **0.9114** | 0.9975 | 0.9668 |
| **Exp D** | Full FinGuard Extended Feature Set | 38 | **0.9231** | **0.9000** | **0.9114** | **0.9978** | **0.9720** |

### Verified Impact:
- Adding behavioural baselines improves Recall from $0.8750$ to $0.9000$ and PR-AUC by $+0.0172$.
- Velocity features improve Precision from $0.9000$ to $0.9231$ and lift PR-AUC by $+0.0055$.
- Extended multi-horizon features lift PR-AUC to the highest score of $0.9720$ (+0.0279 over transaction-only).

---

## 9. Explainability & SHAP Attributions

- **Explainer:** TreeSHAP (`shap.TreeExplainer(booster)`)
- **Global Feature Importance (Batch-Wide Mean Absolute SHAP):**
  1. `amt_to_baseline_ratio`: 1.8421
  2. `dist1`: 1.5190
  3. `velocity_hours_since_last_tx`: 1.2844
  4. `C2`: 1.2052
  5. `amt_zscore`: 1.1480
  6. `TransactionAmt`: 1.0924
  7. `device_anomaly_flag`: 0.9412
  8. `is_off_hours`: 0.8105
- **Local Transaction Example (TransactionID 3000213, Customer CUST_0025, Alert ALT_BATCH-2026-0002_3000213):**
  - Calibrated Risk Score: 95.2 (HIGH)
  - Primary Driver: Location Change
  - Factor 1: `dist1` = 460 miles (SHAP: +1.5338, INCREASES_RISK)
  - Factor 2: `C2` = 7 (SHAP: +1.2652, INCREASES_RISK)
  - Factor 3: `amt_to_baseline_ratio` = 5.1x baseline (SHAP: +1.1485, INCREASES_RISK)
  - Factor 4: `TransactionAmt` = $420.03 (SHAP: +1.1046, INCREASES_RISK)

---

## 10. Operational Batch Throughput & Risk Distribution

*Source Verification:* MongoDB `batches` collection, `BATCH-2026-0002`

- **Batch Identifier:** `BATCH-2026-0002`
- **Total Scored:** 2,200 transactions
- **Processing Time:** 1.82 seconds
- **Throughput:** ~1,208 transactions / second
- **Risk Distribution:**
  - High Risk ($\ge 75$): 115 transactions (5.2%)
  - Medium Risk ($40 - 74$): 19 transactions (0.9%)
  - Low Risk ($< 40$): 2,066 transactions (93.9%)

---

## 11. REST API Latency Benchmark (Live Measurements)

*Source Artifact:* `results/api_latency_benchmark.csv` (25 iterations per endpoint)

| Endpoint | Reqs | Mean Latency | Median (p50) | p95 Latency | p99 Latency | Success Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/dashboard/summary` | 25 | 51.71 ms | 50.42 ms | 64.61 ms | 66.15 ms | 100% |
| `GET /api/dashboard/risk-distribution` | 25 | 25.28 ms | 28.20 ms | 32.75 ms | 32.85 ms | 100% |
| `GET /api/dashboard/risk-trend` | 25 | 81.39 ms | 80.61 ms | 90.79 ms | 102.79 ms | 100% |
| `GET /api/alerts (page=0, size=20)` | 25 | 25.91 ms | 29.34 ms | 34.85 ms | 35.00 ms | 100% |
| `GET /api/alerts/{id}` | 25 | 29.33 ms | 30.60 ms | 33.79 ms | 34.41 ms | 100% |
| `GET /api/customers/{id}` | 25 | 28.11 ms | 30.98 ms | 34.35 ms | 34.42 ms | 100% |
| `GET /api/customers/{id}/explanation` | 25 | 20.64 ms | 16.33 ms | 30.49 ms | 31.34 ms | 100% |
| `GET /api/batches` | 25 | 17.33 ms | 16.04 ms | 28.97 ms | 29.04 ms | 100% |

All decision-support endpoints respond under 85 ms on average and under 105 ms at 99th percentile.

---

## 12. Database Collections & Active Secondary Indexes

- **Target Database:** MongoDB `finguard`
- **Active Collections:** `batches`, `models`, `customers`, `behaviour_profiles`, `transactions`, `risk_scores`, `alerts`, `explanations`
- **Active Indexes Verified:**
  - `alerts`: `idx_alerts_batch_id`, `idx_alerts_risk_level`, `idx_alerts_status`, `idx_alerts_risk_score`, `idx_alerts_customer_id`
  - `transactions`: `idx_transactions_cust_id`, `idx_transactions_batch_id`, `idx_transactions_dt`, `idx_transactions_created`
  - `risk_scores`: `idx_scores_cust_id`, `idx_scores_batch_id`, `idx_scores_risk_level`, `idx_scores_risk_score`
  - `explanations`: `idx_expl_tx_id`, `idx_expl_cust_id`, `idx_expl_batch_id`
  - `batches`: `idx_batches_id_unique` (unique on `batch_id`), `idx_batches_started_at`

---

## 13. Security & Access Control Verification

- **Authentication:** HMAC-SHA256 JWT tokens via JJWT 0.11.5
- **Roles:** `ROLE_ANALYST`, `ROLE_ADMIN`
- **CORS:** Configured via `finguard.cors.allowed-origins` (`http://localhost:5173,http://localhost:3000`). Wildcard `*` eliminated.
- **Exception Handling:** Centralized `@RestControllerAdvice` handling `ResourceNotFoundException`, `InvalidRequestException`, `AccessDeniedException`, and validation errors.

---

## 14. Automated Test Suite Execution Summary

- **ML Test Suites:**
  - `ml/tests/test_no_data_leakage.py`: 4 tests, 0 failures, 0 errors (**PASSED**)
  - `ml/tests/test_pipeline_integration.py`: 6 tests, 0 failures, 0 errors (**PASSED**)
  - **ML Subtotal:** 10 passed / 10 total
- **Spring Boot Backend Test Suites:**
  - `AuthControllerTest`: 4 tests, 0 failures, 0 errors (**PASSED**)
  - `AlertServiceTest`: 5 tests, 0 failures, 0 errors (**PASSED**)
  - **Backend Subtotal:** 9 passed / 9 total
- **Grand Total:** 19 automated tests executed, **19 passed, 0 failed, 0 skipped**.
