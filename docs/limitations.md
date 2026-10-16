# FinGuard: System Limitations & Research Constraints

## 1. Overview

To maintain academic and research integrity, this document explicitly details the boundaries, assumptions, and known limitations of the current FinGuard implementation.

## 2. Dataset Constraints

1. **Benchmark Scale:** The current pipeline is evaluated on an IEEE-CIS-schema-compliant benchmark dataset comprising 2,200 transactions across 120 customers. While sufficient for end-to-end pipeline validation and benchmarking, it does not match the multi-million row scale of full production payment switches.
2. **Synthetic / Anonymized Identity:** IEEE-CIS benchmark data uses anonymized V-codes, C-counts, and D-timedeltas. Customer IDs and emails in the demo layer are formatted for analyst presentation.

## 3. Architecture & Operational Boundaries

1. **Strict Batch Architecture:** FinGuard is intentionally a batch decision-support system. It does NOT operate as an in-line, sub-100ms payment gateway authorization blocker. Transactions are scored in scheduled batches.
2. **Decision Support, Not Automation:** The system generates calibrated risk scores and SHAP explanations for human fraud analysts. It does not autonomously seize funds, freeze accounts, or reverse transactions.
3. **Hardware Environment:** Benchmarks were collected on a standard Windows 11 development workstation (Intel/AMD x64, 16GB RAM) utilizing local MongoDB. Distributed cluster scaling (e.g. Apache Spark, Kubernetes) remains future work.

## 4. Planned vs Implemented Status Table

| Capability | Status | Notes |
| :--- | :--- | :--- |
| **Leakage-Safe Feature Engineering** | **IMPLEMENTED** | Causal sequential baselines verified by unit tests |
| **Temporal Evaluation Mode** | **IMPLEMENTED** | 75/25 chronological train/test partition |
| **Baseline Models Comparison** | **IMPLEMENTED** | Logistic Regression, Random Forest, XGBoost |
| **PR-AUC Metric Calculation** | **IMPLEMENTED** | Integrated in evaluation and ablation reports |
| **Probability Calibration (Platt)** | **IMPLEMENTED** | Sigmoid calibration via 3-fold cross validation |
| **Brier Score & ECE Evaluation** | **IMPLEMENTED** | Calculated and verified empirically |
| **Feature Ablation Study** | **IMPLEMENTED** | Experiments A, B, C, D completed |
| **Non-Destructive Batch Management** | **IMPLEMENTED** | `batches` collection, auto-incrementing ID |
| **Secondary MongoDB Indexes** | **IMPLEMENTED** | 17 compound/single indexes created & active |
| **Spring Boot Service Layer Refactor** | **IMPLEMENTED** | Controller -> Service -> Repository pattern |
| **Spring Security & JWT & RBAC** | **IMPLEMENTED** | ANALYST and ADMIN roles enforced |
| **Configurable CORS (No Wildcards)** | **IMPLEMENTED** | Whitelisted origin pattern configured |
| **Centralized Error Handling** | **IMPLEMENTED** | `@RestControllerAdvice` global handler |
| **API Latency Benchmark Suite** | **IMPLEMENTED** | Actual p50, p95, p99 latencies measured |
| **Batch Selector in UI** | **IMPLEMENTED** | React UI reflects selected batch data |
| **Real Timestamp Risk Trend** | **IMPLEMENTED** | Hourly, daily, and batch aggregations |
| **Cold-Start Customer Flag** | **IMPLEMENTED** | Population fallback and UI indicator |
| **Automated Cron / Airflow Scheduling**| **PLANNED** | Currently triggered via CLI / API |
| **Real-time Streaming (Kafka / Flink)** | **NOT IMPLEMENTED** | Out of scope for batch decision support |
| **Distributed Multi-Node Sharding** | **PLANNED** | Single-node MongoDB instance currently used |
