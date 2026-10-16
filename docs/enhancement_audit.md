# FinGuard Enhancement Audit & Research Pre-Flight Report

**Project Title:** FinGuard: Explainable AI-Driven Risk Scoring for Fraud Analyst Decision Support  
**Audit Purpose:** Comprehensive architectural, data integrity, security, and algorithmic audit prior to enhancement.  
**Auditor:** Antigravity AI Coding Assistant  
**Date:** 2026-10-04  
**Audit Rule:** Non-destructive audit. Zero production code modified during this phase.

---

## 1. Current Architecture

FinGuard implements a strictly decoupled, 3-tier asynchronous batch decision-support architecture:

```
[IEEE-CIS Dataset (CSV)] 
       │
       ▼
[Python ML Batch Pipeline (ml/)] ──(Offline Inference & SHAP)──► [MongoDB Database (finguard)]
                                                                          │
                                                                          ▼ (Read-Only Queries)
                                                              [Spring Boot REST API (backend/)]
                                                                          │
                                                                          ▼ (HTTP/JSON)
                                                              [React Frontend Dashboard (frontend/)]
                                                                          │
                                                                          ▼
                                                                [Human Fraud Analyst]
```

### Key Architectural Tenets Verified:
1. **Decoupled Execution:** Spring Boot **never** invokes Python runtime, C-APIs, or XGBoost libraries. It communicates strictly via MongoDB.
2. **Decision Support Only:** The system does not autonomously cancel transactions or block cards; it scores transactions offline, generates explanations, and presents prioritized alerts with contextual baselines for human analyst adjudication.
3. **No Message Queue / No Microservice Overhead:** Data handoff occurs directly through MongoDB document persistence.

---

## 2. Current ML Pipeline

The Python ML pipeline is located in `ml/` with the following entry points and modules:

| Script / Module | Current Functionality | Input | Output / Artifact |
|---|---|---|---|
| [`ml/data_loader.py`](file:///d:/Fraud%20Detection/ml/data_loader.py) | Ingests or synthetically generates IEEE-CIS schema transactions; derives customer identifiers | Raw CSVs or synthetic generation | `train_transaction.csv`, `train_identity.csv`, merged `DataFrame` |
| [`ml/features.py`](file:///d:/Fraud%20Detection/ml/features.py) | Generates timing, velocity, baseline ratios, rolling 24h metrics, and categorical label encoding | Merged `DataFrame` | Engineered `DataFrame` (23 features), `customer_profiles` list |
| [`ml/train.py`](file:///d:/Fraud%20Detection/ml/train.py) | Splits data ($75/25$), configures and trains `xgb.XGBClassifier`, prints classification metrics | Engineered features & labels | `ml/models/finguard_xgb.json`, `ml/models/features.json` |
| [`ml/batch_scorer.py`](file:///d:/Fraud%20Detection/ml/batch_scorer.py) | Loads booster, computes probabilities, maps raw prob to risk score ($0-100$), computes `shap.TreeExplainer` values, maps primary driver, wipes and populates 6 MongoDB collections | `finguard_xgb.json`, raw CSVs | 6 MongoDB collections populated |
| [`ml/run_pipeline.py`](file:///d:/Fraud%20Detection/ml/run_pipeline.py) | Master orchestrator invoking `train_model()` then `score_batch()` sequentially | None | End-to-end execution log & collection counts |

---

## 3. Current Feature Engineering

The current model consumes **23 features** defined in `ml/models/features.json`:
1. `TransactionAmt`: Raw transaction dollar amount.
2. `amt_to_baseline_ratio`: Ratio of current transaction amount to customer historical baseline mean.
3. `amt_zscore`: Standard deviations of transaction amount from customer mean.
4. `velocity_hours_since_last_tx`: Elapsed hours since customer's previous transaction.
5. `velocity_rapid_tx_flag`: Binary indicator ($\Delta t < 15\text{ minutes}$).
6. `is_off_hours`: Binary indicator for transactions outside active hours ($p_{10}$ to $p_{90}$) or between 01:00–04:00.
7. `tx_freq_24h`: 24-hour rolling transaction frequency count.
8. `amt_sum_24h`: 24-hour rolling transaction spend sum.
9. `spend_24h_to_baseline_ratio`: Ratio of 24h spend to baseline average amount.
10. `device_anomaly_flag`: Binary flag indicating mismatch between transaction device and primary registered device.
11. `hour_of_day`: Transaction hour in UTC ($0-23$).
12. `day_of_week`: Transaction day of week ($0-6$).
13. `baseline_avg_amt`: Customer historical average transaction amount.
14. `C1`: Counting/frequency tracking metric 1 from IEEE-CIS.
15. `C2`: Counting/frequency tracking metric 2 from IEEE-CIS.
16. `C4`: Counting/frequency tracking metric 4 from IEEE-CIS.
17. `D1`: Timedelta metric 1 (days since card activity).
18. `D2`: Timedelta metric 2 (days since prior transaction).
19. `dist1`: Geographic distance from registered address in miles.
20. `ProductCD_enc`: Label-encoded product category code.
21. `card4_enc`: Label-encoded card network.
22. `card6_enc`: Label-encoded card type (debit/credit).
23. `DeviceType_enc`: Label-encoded device family (desktop/mobile).

---

## 4. Current Data Leakage Points

### Critical Findings:
1. **Global Aggregation Leakage:**
   In [`ml/features.py:L38-L54`](file:///d:/Fraud%20Detection/ml/features.py#L38-L54), customer baselines (`baseline_avg_amt`, `baseline_std_amt`, `baseline_median_amt`, `min_hour`, `max_hour`, `primary_device`, `primary_card`) are computed using `df.groupby("customer_id").agg(...)` on the **entire dataset** prior to splitting.
   - **Leakage Consequence:** Future transactions (including transactions placed in the test split) are averaged into the customer's historical mean and standard deviation, leaking future behavior into training samples.
2. **Preprocessor Leakage:**
   `LabelEncoder.fit_transform()` is executed on the full dataset before `train_test_split()`, leaking categorical vocabulary and class frequencies across splits.
3. **Rolling Window Leakage on Full Set:**
   Rolling metrics (`tx_freq_24h`, `amt_sum_24h`) are computed sequentially per customer, but if transactions are randomly partitioned after calculation, training samples have seen future historical states.

---

## 5. Current Evaluation Methodology

1. **Random Stratified Splitting:**
   - Evaluated using `sklearn.model_selection.train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)`.
   - **Flaw:** Fraud detection is fundamentally a temporal problem. In production, models are trained on past data to predict future transactions. Random splitting allows past transactions to be evaluated using models trained on future transactions.
2. **Missing Metrics:**
   - Evaluates: Precision ($91.4\%$), Recall ($97.0\%$), F1 ($0.9412$), ROC-AUC ($0.9992$), Confusion Matrix ($\text{TN}=514, \text{FP}=3, \text{FN}=1, \text{TP}=32$).
   - **Missing:** PR-AUC (Precision-Recall Area Under Curve), Accuracy, Brier score, ECE (Expected Calibration Error). PR-AUC is essential for imbalanced fraud datasets ($6\%$ positive rate).
3. **No Baseline Models:**
   - XGBoost is evaluated in isolation. There are no comparative experiments with Logistic Regression, Random Forest, or non-behavioral models.

---

## 6. Current MongoDB Design

* **Database:** `finguard` (port 27017)
* **Collections (6 active):**
  1. `customers`: 120 documents (`_id`, `customer_id`, `full_name`, `email`, `card1`, `card4`, `card6`, `addr1`, `addr2`, `primary_device`, `status`, `created_at`).
  2. `transactions`: 2,200 documents (`_id`, `transaction_id`, `customer_id`, `amount`, `product_cd`, `card4`, `card6`, `device_type`, `device_info`, `hour_of_day`, `day_of_week`, `is_fraud_ground_truth`, `created_at`).
  3. `behaviour_profiles`: 120 documents (`_id`, `customer_id`, `baseline_avg_amt`, `baseline_std_amt`, `baseline_median_amt`, `total_transactions`, `typical_active_hours`, `primary_device`, `primary_card`, `last_updated`).
  4. `risk_scores`: 2,200 documents (`_id`, `transaction_id`, `customer_id`, `risk_score`, `risk_level`, `raw_probability`, `model_version`, `scored_at`).
  5. `alerts`: 2,200 documents (`_id`, `alert_id`, `transaction_id`, `customer_id`, `customer_name`, `amount`, `risk_score`, `risk_level`, `primary_risk_driver`, `status`, `created_at`, `analyst_notes`).
  6. `explanations`: 2,200 documents (`_id`, `transaction_id`, `customer_id`, `base_value`, `top_factors`, `generated_at`).
* **Critical Flaw:**
  - **Destructive Batch Overwrites:** In [`ml/batch_scorer.py:L149-L154`](file:///d:/Fraud%20Detection/ml/batch_scorer.py#L149-L154), all 6 collections are wiped via `delete_many({})` on every batch run.
  - **No Batch Versioning:** No collection stores batch run metadata or allows querying historical batches.
  - **No Secondary Indexes:** Every collection only possesses the default `_id_` index. Queries on `risk_score`, `status`, `customer_id`, and `transaction_id` perform full collection scans.

---

## 7. Current Backend Design

* **Stack:** Spring Boot 3.2.5, Spring Data MongoDB, Tomcat on port 8080.
* **Structure:**
  - `RootController.java`: API index (`/`)
  - `DashboardController.java`: Summary KPIs (`/api/dashboard/summary`)
  - `AlertController.java`: Alert queue & mutation (`/api/alerts`, `/api/alerts/{id}/status`)
  - `CustomerController.java`: Customer profile, baselines, and SHAP lookup (`/api/customers/{id}`)
* **Architectural Flaws:**
  - **Missing Service Layer:** Controllers directly interact with Spring Data repositories; business aggregation logic (e.g. risk trend bucketing, SHAP aggregation) is embedded directly in Controller methods.
  - **Hardcoded Strings:** DTO fields hardcode batch ID (`BATCH-2026-XGB-01`), model name, and dataset descriptions.
  - **Incomplete Error Handling:** No `@ControllerAdvice` or global exception handler; failures default to standard Spring 500 error pages.

---

## 8. Current Frontend Design

* **Stack:** React 19.2.8, Vite 8.3.0, Tailwind CSS 4.3.3, Recharts 3.10.1, Axios 1.20.0, Lucide-React 1.45.0.
* **Component Architecture (Modular):**
  - `Navbar.jsx`, `Dashboard.jsx`, `KpiCard.jsx`, `RiskDistribution.jsx`, `RiskTrend.jsx`, `TopRiskDrivers.jsx`, `BatchInfo.jsx`, `PriorityAlertsTable.jsx`, `RiskBadge.jsx`, `StatusBadge.jsx`, `CustomerDetail.jsx`, `BehaviourBaseline.jsx`, `BehaviourDeviation.jsx`, `ShapExplanation.jsx`, `DecisionPanel.jsx`, `TransactionHistory.jsx`.
* **Frontend Flaws:**
  - Lacks batch selection UI (only displays currently loaded batch).
  - Lacks model calibration indicator.
  - Lacks authentication UI / analyst role management.

---

## 9. Current Security Status

* **Authentication:** ❌ **NOT IMPLEMENTED**. No Spring Security, no JWT, no user logins.
* **Authorization / RBAC:** ❌ **NOT IMPLEMENTED**. Any client can access or update alerts.
* **CORS:** ⚠️ Overly permissive in [`CorsConfig.java`](file:///d:/Fraud%20Detection/backend/src/main/java/com/finguard/config/CorsConfig.java) with `allowedOriginPatterns("*")`.

---

## 10. Current Hardcoded Configuration

| Configuration Item | File Location | Value | Required Fix |
|---|---|---|---|
| Batch ID | `DashboardController.java:L147` | `"BATCH-2026-XGB-01"` | Pull dynamically from `batches` collection |
| Model Version String | `DashboardController.java:L148` | `"XGBoost v1.0 (Gradient Boosted Trees)"` | Pull from `models` collection |
| Dataset Description | `DashboardController.java:L150` | `"IEEE-CIS Fraud Benchmark (2,200 tx)"` | Pull from batch metadata |
| Risk Score Thresholds | `batch_scorer.py`, `PriorityAlertsTable.jsx` | $40.0$ (Medium), $75.0$ (High) | Centralize in configuration properties |
| Risk Score Calculation | `batch_scorer.py:L208` | `round(raw_prob * 100.0, 1)` | Switch to calibrated probability |
| CORS Origins | `CorsConfig.java` | `*` | Configure allowed origins via properties |

---

## 11. Existing Functionality That Must NOT Be Broken

1. Strict non-realtime batch decision-support architecture.
2. Spring Boot separation (Spring Boot must never call Python or load XGBoost).
3. Human analyst decision workflow (`NEW` $\rightarrow$ `UNDER REVIEW` $\rightarrow$ `CONFIRMED FRAUD` / `FALSE POSITIVE`).
4. Granular local SHAP feature waterfall with plain-English factor descriptions and directional impacts (+INCREASES RISK / -MITIGATES RISK).
5. Customer Baseline Profile & Behaviour Deviation comparison widget ($X\times$ normal spending, unrecognized hardware, off-hours timing).
6. Analyst status mutation endpoint: `PUT /api/alerts/{id}/status`.
7. Existing working frontend layout and responsiveness.

---

## 12. Recommended Implementation Order

To execute the 24 phases with zero regression and maximum scientific rigor:

1. **Phase 2 & Phase 3 (Data & ML Foundation):**
   - Implement leakage-safe customer baselining (only historical transactions prior to time $t$).
   - Implement automated leakage verification test (`ml/tests/test_no_data_leakage.py`).
   - Implement temporal train/test split based on actual timestamps.
2. **Phase 4 & Phase 5 (Baseline Models & PR-AUC):**
   - Implement Logistic Regression and Random Forest baselines in `ml/evaluation/`.
   - Calculate PR-AUC, ROC-AUC, F1, Precision, Recall, Accuracy across all models.
   - Output `results/model_comparison.csv`.
3. **Phase 6 & Phase 7 (Calibration & Risk Scoring):**
   - Implement Platt scaling / Isotonic regression on validation split.
   - Compute Brier score and ECE (Expected Calibration Error).
   - Update risk scoring to utilize calibrated probability.
   - Centralize configurable thresholds.
4. **Phase 8, 9 & 10 (Advanced Features, Cold Start & Ablation):**
   - Add leakage-safe temporal features and `cold_start_customer_flag`.
   - Run 4 ablation experiments (A: Transaction, B: Transaction+Behaviour, C: +Velocity, D: Full FinGuard).
   - Output `results/ablation_study.csv`.
5. **Phase 11, 12, 13, 14 & 15 (Batch Management, Model Tracking & MongoDB):**
   - Create `batches`, `models`, `experiments` collections in MongoDB.
   - Remove destructive `delete_many({})`; implement non-destructive batch appending with automatic batch IDs (`BATCH-2026-0001`, etc.).
   - Create secondary MongoDB indexes on `batch_id`, `risk_score`, `customer_id`, `status`.
6. **Phase 16, 17 & 18 (Backend Refactoring & Security):**
   - Refactor Spring Boot into Controller $\rightarrow$ Service $\rightarrow$ Repository.
   - Implement Spring Security with JWT authentication and RBAC (`ROLE_ANALYST`, `ROLE_ADMIN`).
   - Restrict CORS and add global exception handling (`@ControllerAdvice`).
7. **Phase 19 & 20 (Frontend Intelligence & Real Trend):**
   - Add batch history selector, calibrated probability display, and cold-start badge.
   - Implement true chronological risk trend chart by hour/day/batch.
8. **Phase 21 & 22 (Testing & Performance Benchmarking):**
   - Create automated API latency benchmark measuring p50, p95, p99.
   - Run all ML, backend, and integration tests.
9. **Phase 23 & 24 (Documentation & Journal Evidence):**
   - Create modular markdown documentation under `docs/`.
   - Generate comprehensive `docs/journal_evidence_report.md`.
