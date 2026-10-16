# FinGuard: Architecture Specification

## 1. System Overview

**Status:** IMPLEMENTED AND VERIFIED

FinGuard is an explainable AI-driven risk scoring decision-support system designed to assist human fraud analysts in transaction risk triage. The architecture strictly enforces a batch-processing paradigm where machine learning models compute calibrated risk probabilities and SHAP feature attributions offline, persisting structured decision-support records to MongoDB. The Spring Boot application acts as a read-oriented API gateway, serving the React analyst dashboard.

```
+-------------------------------------------------------------+
|                     Python Batch Pipeline                   |
|  - Causal Feature Engineering (Leakage-Safe)               |
|  - XGBoost Classifier (Native JSON persistence)            |
|  - Platt Scaling Probability Calibration (Sigmoid)         |
|  - TreeSHAP Local & Global Factor Attribution              |
+-------------------------------------------------------------+
                              |
                              v (Non-destructive bulk writes)
+-------------------------------------------------------------+
|                      MongoDB Database                       |
|  - Collections: batches, models, customers, transactions,  |
|                 behaviour_profiles, risk_scores, alerts,   |
|                 explanations                                |
|  - Secondary compound indexes on batch_id, status, risk    |
+-------------------------------------------------------------+
                              |
                              v (Spring Data MongoDB)
+-------------------------------------------------------------+
|                 Spring Boot REST API (Port 8080)            |
|  - Architecture: Controller -> Service -> Repository       |
|  - Spring Security with JWT & RBAC (ANALYST, ADMIN)        |
|  - Configurable CORS (No wildcards)                        |
|  - Centralized Global Exception Handling                   |
+-------------------------------------------------------------+
                              |
                              v (Axios with Bearer Interceptor)
+-------------------------------------------------------------+
|                React Fraud Analyst Dashboard                |
|  - Batch Selector & Model Traceability Lineage              |
|  - Real Timestamp Risk Trend (Hourly, Daily, Batch)         |
|  - Calibrated Risk Score & Cold-Start Customer Badges       |
|  - SHAP Factor Waterfall & Behavioural Deviation Profiler   |
|  - Analyst Decision Support Queue & Review Workflow         |
+-------------------------------------------------------------+
                              |
                              v
                      [ Human Fraud Analyst ]
```

## 2. Core Architectural Guarantees

1. **Strict Decision Support:** FinGuard does NOT autonomously block transactions and does NOT replace human analysts. Every alert requires human judgment.
2. **Decoupled Scoring Engine:** The Spring Boot backend never invokes Python or XGBoost directly at runtime. All scoring is performed offline during scheduled or on-demand batch runs.
3. **Immutability & Traceability:** Batch data is persisted non-destructively. Every transaction, risk score, alert, and explanation is indexed by `batch_id` and linked to the exact `model_version` that evaluated it.
4. **Causal Temporal Integrity:** Feature engineering adheres strictly to temporal causality. At no point in training or inference does future transaction data enter historical behavioral baselines.

## 3. Technology Stack Versions

| Layer | Component | Version | Role |
| :--- | :--- | :--- | :--- |
| **ML Engine** | Python | 3.11.16 | Batch feature engineering & model training |
| | XGBoost | 3.2.0 | Gradient boosted decision trees classifier |
| | SHAP | 0.51.0 | Exact TreeSHAP factor attributions |
| | Scikit-Learn | 1.9.1 | Calibration, baseline models, metrics |
| | PyMongo | 4.18.1 | Database driver & indexing |
| **Database** | MongoDB | 8.3.7 | Document store (port 27017, db: `finguard`) |
| **Backend** | Java | 17.0.18 (Eclipse Adoptium) | Runtime environment |
| | Spring Boot | 3.2.5 | REST API framework |
| | Spring Security | 6.2.4 | Authentication & RBAC |
| | JJWT | 0.11.5 | Token generation & verification |
| **Frontend** | React | 19.2.8 | User interface components |
| | Vite | 8.3.0 | Bundler and development server |
| | Tailwind CSS | 4.3.3 | Design system styling |
| | Recharts | 2.15.1 | Data visualization & trends |
| | Axios | 1.8.4 | HTTP client |
