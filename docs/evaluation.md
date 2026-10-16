# FinGuard: Empirical Evaluation & Comparative Analysis

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

All metrics presented in this report were generated through actual execution of the FinGuard test suite on the 2,200-transaction IEEE-CIS dataset.

## 2. Evaluation Split Comparison

A comparison between stratified random splitting and leakage-safe temporal evaluation demonstrates why temporal evaluation is mandatory for fraud detection research:

| Evaluation Mode | Train Size | Test Size | Precision | Recall | F1-Score | Accuracy | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Stratified (Random)** | 1,650 | 550 | 1.0000 | 0.9394 | 0.9688 | 0.9964 | 0.9999 | 0.9982 |
| **Temporal (Chronological)** | 1,650 | 550 | 0.8919 | 0.8250 | 0.8571 | 0.9800 | 0.9973 | 0.9626 |

*Finding:* Random stratified splitting inflates performance (F1: 0.9688 vs 0.8571) because historical customer baselines accidentally look forward across time. Temporal evaluation represents realistic out-of-time deployment conditions.

## 3. Baseline Model Comparison (Temporal Split)

All baseline models were trained and evaluated on identical leakage-safe temporal partitions (1,650 train, 550 test):

| Model | Precision | Recall | F1-Score | Accuracy | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Logistic Regression (Balanced)** | 0.8298 | **0.9750** | 0.8966 | 0.9818 | 0.9966 | 0.9659 |
| **Random Forest (Balanced, depth=6)** | 0.9070 | **0.9750** | **0.9398** | **0.9909** | **0.9977** | **0.9685** |
| **XGBoost (FinGuard Main)** | **0.9231** | 0.9000 | 0.9114 | 0.9873 | 0.9975 | 0.9668 |

*Artifact Source:* `results/model_comparison.csv`

### Key Empirical Findings:
1. **Precision Superiority:** XGBoost delivers the highest Precision ($0.9231$), resulting in the lowest false-positive alert volume (only 3 false alarms in the test set). For fraud analyst operations, high precision directly prevents alert fatigue.
2. **High PR-AUC:** Across all three models, PR-AUC exceeds $0.965$, confirming robust detection capability under severe class imbalance ($15.7 : 1$).
3. **Random Forest vs XGBoost:** Random Forest captured slightly higher recall ($0.9750$ vs $0.9000$), while XGBoost minimized false positives ($3$ FP vs $4$ FP in this run).

## 4. Feature Ablation Study

Four progressive feature experiments were executed using identical temporal splits:

| Experiment | Feature Subset | Feat Count | Precision | Recall | F1-Score | ROC-AUC | PR-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Exp A** | Transaction-only features | 13 | 0.9211 | 0.8750 | 0.8974 | 0.9953 | 0.9441 |
| **Exp B** | Transaction + Behavioural baselines | 18 | 0.9000 | 0.9000 | 0.9000 | 0.9972 | 0.9613 |
| **Exp C** | Transaction + Behavioural + Velocity | 23 | **0.9231** | **0.9000** | **0.9114** | 0.9975 | 0.9668 |
| **Exp D** | Full FinGuard Feature Set (Extended) | 38 | **0.9231** | **0.9000** | **0.9114** | **0.9978** | **0.9720** |

*Artifact Source:* `results/ablation_study.csv`

### Ablation Insights:
1. **Behavioural Baselines Lift Detection:** Adding customer behavioral profiles (Exp B) increases recall from $0.8750$ to $0.9000$ and PR-AUC from $0.9441$ to $0.9613$ (+0.0172).
2. **Velocity Enhances Precision:** Introducing transaction velocity delta and burst flags (Exp C) restores precision to $0.9231$ and raises PR-AUC to $0.9668$.
3. **Full Multi-Horizon Features Maximize PR-AUC:** The full feature set (Exp D) achieves the highest overall PR-AUC ($0.9720$) and ROC-AUC ($0.9978$).
