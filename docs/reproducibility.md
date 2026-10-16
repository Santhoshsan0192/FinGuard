# FinGuard: Reproducibility Guide

## 1. Prerequisites

- Python 3.11+
- OpenJDK 17
- Apache Maven 3.9+
- Node.js 18+ and npm
- MongoDB 7.0+ running on `localhost:27017`

## 2. Step-by-Step Reproduction Sequence

### Step 1: Environment Setup
```powershell
# Navigate to project root
cd "d:\Fraud Detection"

# Activate Python virtual environment
ml\.venv\Scripts\activate
```

### Step 2: Initialize Database Indexes
```powershell
python ml/init_db_indexes.py
```

### Step 3: Run Automated Leakage & Pipeline Tests
```powershell
python -m unittest discover -s ml/tests -p "test_*.py"
```

### Step 4: Execute Temporal Model Training & Probability Calibration
```powershell
python ml/train.py --evaluation-mode temporal --calibrate
```

### Step 5: Run Baseline Model Comparison
```powershell
python ml/evaluation/compare_models.py temporal
```
*Generates:* `results/model_comparison.csv`

### Step 6: Run Feature Ablation Study
```powershell
python ml/evaluation/ablation_study.py
```
*Generates:* `results/ablation_study.csv`

### Step 7: Execute Unified Batch Pipeline (Scoring & SHAP Generation)
```powershell
python ml/run_pipeline.py --evaluation-mode temporal
```

### Step 8: Build and Test Spring Boot Backend
```powershell
cd "d:\Fraud Detection\backend"
mvn clean test
mvn spring-boot:run
```

### Step 9: Run Live API Performance Benchmark
```powershell
python "d:\Fraud Detection\backend\benchmark_api.py"
```
*Generates:* `results/api_latency_benchmark.csv`

### Step 10: Launch React Analyst Dashboard
```powershell
cd "d:\Fraud Detection\frontend"
npm install
npm run build
npm run dev
```
Open browser at `http://localhost:5173`.
Default accounts for authentication:
- Analyst: `analyst` / `analyst123`
- Admin: `admin` / `admin123`
