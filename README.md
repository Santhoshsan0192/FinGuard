# FinGuard — Explainable AI-Driven Risk Scoring for Fraud Analyst Decision Support

> **Academic Final-Year Project & Research Paper Implementation**  
> **Architecture Pattern:** Batch-Processing Decision-Support System (Strictly Non-Realtime)  
> **Core Principle:** Strict Decision Support — Never autonomously blocks transactions or replaces human fraud analysts.

---

## 1. Executive Summary & Verification Status

FinGuard has been enhanced across 24 research-oriented phases to eliminate data leakage, implement temporal out-of-time evaluation, provide probability calibration, benchmark baseline models, execute feature ablation experiments, establish non-destructive batch versioning, implement Spring Security with JWT and RBAC, and benchmark live API latencies with zero metric fabrication.

### Verification Status Table

| Area | Component | Implementation Status | Empirical Verification |
| :--- | :--- | :---: | :---: |
| **ML** | Leakage-Safe Behavioral Profiling | ✅ IMPLEMENTED | `ml/tests/test_no_data_leakage.py` (4/4 Passed) |
| **ML** | Temporal Evaluation Mode | ✅ IMPLEMENTED | 75/25 Chronological Partition (F1: 0.8571, PR-AUC: 0.9626) |
| **ML** | Baseline Models (LogReg, RF, XGB) | ✅ IMPLEMENTED | `results/model_comparison.csv` |
| **ML** | Probability Calibration (Platt) | ✅ IMPLEMENTED | Brier: 0.0118, ECE: 0.0129 |
| **ML** | Feature Ablation Study (Exp A-D) | ✅ IMPLEMENTED | `results/ablation_study.csv` |
| **ML** | SHAP TreeExplainer Decomposition | ✅ IMPLEMENTED | Positive / Negative Drivers & Global Importance |
| **DB** | Non-Destructive Batch Management | ✅ IMPLEMENTED | `batches` collection, `BATCH-YYYY-NNNN` |
| **DB** | MongoDB Secondary Indexes | ✅ IMPLEMENTED | 17 Active compound/single indexes |
| **Backend** | Spring Boot Service Layer Refactor | ✅ IMPLEMENTED | Controller → Service → Repository |
| **Backend** | Spring Security & JWT & RBAC | ✅ IMPLEMENTED | `ROLE_ANALYST`, `ROLE_ADMIN` (`AuthControllerTest`) |
| **Backend** | Configurable Whitelisted CORS | ✅ IMPLEMENTED | `finguard.cors.allowed-origins` (No `*`) |
| **Backend** | Centralized Exception Handling | ✅ IMPLEMENTED | `@RestControllerAdvice` Global Handler |
| **Backend** | Live API Latency Benchmark | ✅ IMPLEMENTED | `results/api_latency_benchmark.csv` (All < 85ms mean) |
| **Frontend** | Batch Selector & Traceability | ✅ IMPLEMENTED | Batch dropdown, model version, calibration badge |
| **Frontend** | Real Timestamp Risk Trend | ✅ IMPLEMENTED | Hourly, Daily, and Batch aggregation modes |
| **Frontend** | Cold-Start Customer Indicator | ✅ IMPLEMENTED | Population fallback & badge in UI |

---

## 2. Empirical Research Findings

### Baseline Model Comparison (Temporal Split)
*Source: `results/model_comparison.csv`*

| Model | Precision | Recall | F1-Score | Accuracy | ROC-AUC | PR-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | 0.8298 | **0.9750** | 0.8966 | 0.9818 | 0.9966 | 0.9659 |
| **Random Forest** | 0.9070 | **0.9750** | **0.9398** | **0.9909** | **0.9977** | **0.9685** |
| **XGBoost (FinGuard)** | **0.9231** | 0.9000 | 0.9114 | 0.9873 | 0.9975 | 0.9668 |

*Insight:* XGBoost delivers the highest Precision ($0.9231$), minimizing false-positive alert fatigue for human analysts.

### Feature Ablation Study
*Source: `results/ablation_study.csv`*

| Experiment | Features | Feat Count | Precision | Recall | F1-Score | ROC-AUC | PR-AUC |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Exp A** | Transaction-only | 13 | 0.9211 | 0.8750 | 0.8974 | 0.9953 | 0.9441 |
| **Exp B** | + Behavioural Baselines | 18 | 0.9000 | 0.9000 | 0.9000 | 0.9972 | 0.9613 |
| **Exp C** | + Velocity Features | 23 | **0.9231** | **0.9000** | **0.9114** | 0.9975 | 0.9668 |
| **Exp D** | Full Extended Set | 38 | **0.9231** | **0.9000** | **0.9114** | **0.9978** | **0.9720** |

---

## 3. Directory Layout

```
FinGuard/
├── ml/                         # Python ML Batch Engine (Python 3.11)
│   ├── config.json             # Central configuration & risk thresholds
│   ├── data/                   # IEEE-CIS benchmark CSV files
│   ├── models/                 # finguard_xgb.json, finguard_calibrator.joblib
│   ├── features.py             # Leakage-safe feature engineering & cold-start
│   ├── train.py                # Temporal model training & calibration
│   ├── batch_scorer.py         # Non-destructive batch scoring & SHAP engine
│   ├── run_pipeline.py         # Unified end-to-end execution pipeline
│   ├── init_db_indexes.py      # MongoDB secondary index initialization
│   ├── evaluation/             # Baseline comparison & ablation scripts
│   └── tests/                  # Automated leakage & integration tests
├── backend/                    # Spring Boot REST API (Java 17)
│   ├── benchmark_api.py        # Live REST API latency benchmark script
│   └── src/main/java/com/finguard/
│       ├── controller/         # BatchController, AlertController, CustomerController...
│       ├── service/            # BatchService, AlertService, CustomerService...
│       ├── repository/         # MongoRepository interfaces with batch queries
│       ├── security/           # Spring Security, JwtTokenProvider, JwtAuthFilter
│       ├── exception/          # GlobalExceptionHandler (@RestControllerAdvice)
│       └── model/              # Batch, Alert, Customer, Transaction, RiskScore...
├── frontend/                   # React 19 + Vite 8 + Tailwind CSS Dashboard
│   └── src/
│       ├── api/finguardApi.js  # Axios API client with JWT interceptor
│       └── components/         # BatchInfo, PriorityAlertsTable, RiskTrend...
├── results/                    # Machine-readable benchmark outputs (CSV & JSON)
│   ├── model_comparison.csv
│   ├── ablation_study.csv
│   └── api_latency_benchmark.csv
└── docs/                       # Comprehensive Research Documentation
    ├── architecture.md
    ├── data_pipeline.md
    ├── feature_engineering.md
    ├── model_training.md
    ├── evaluation.md
    ├── explainability.md
    ├── security.md
    ├── batch_management.md
    ├── limitations.md
    ├── reproducibility.md
    └── journal_evidence_report.md
```

---

## 4. Quickstart Reproduction Commands

### 1. Run Machine Learning Pipeline
```powershell
# Activate Python environment
& "d:\Fraud Detection\ml\.venv\Scripts\activate"

# Run leakage and integrity tests
python -m unittest discover -s ml/tests -p "test_*.py"

# Train model temporally with calibration
python ml/train.py --evaluation-mode temporal --calibrate

# Run baseline model comparison & ablation studies
python ml/evaluation/compare_models.py temporal
python ml/evaluation/ablation_study.py

# Execute batch scoring
python ml/run_pipeline.py --evaluation-mode temporal
```

### 2. Run Spring Boot Backend
```powershell
cd "d:\Fraud Detection\backend"
mvn clean test
mvn spring-boot:run
```
Live at `http://localhost:8080`.

### 3. Run React Frontend Dashboard
```powershell
cd "d:\Fraud Detection\frontend"
npm install
npm run build
npm run dev
```
Live at `http://localhost:5173`.  
Default test accounts: `analyst` / `analyst123`, `admin` / `admin123`.
