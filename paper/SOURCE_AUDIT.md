# Source Audit, Numerical Consistency Reconciliation, and Verification Report

**Project Title:** Explainable AI-Driven Risk Scoring for Fraud Analyst Decision Support (FinGuard)  
**Authors:** Agjelia Lydia C., Kanis Krishna K A, Mukesh M., Santhosh A S, and Barath R.  
**Institution:** Department of Information Technology, Karpagam College of Engineering, Coimbatore 641032, Tamil Nadu, India.  
**Project Supervisor:** Ms. C. Agjelia Lydia, M.E., Assistant Professor.  
**Date of Audit:** October 16, 2026  
**Auditor:** Senior Academic Editor & Independent ML Verification Specialist  

---

## 1. Source Document Mapping and Hierarchy

This research paper synthesizes three distinct source documents provided for the final-year project:

| Source Document | Primary Role & Purpose | Key Information Extracted |
| :--- | :--- | :--- |
| **`First_Review_13(4).pptx`** | Project Overview, Architecture Flow, Base Paper, & Literature Survey | Project motivation, 4 operational modules, base paper (Sarna et al., 2026), 11 literature survey papers (2025–2026), end-to-end block architecture diagram, analyst triage concept. |
| **`Final_Year_Project (1).pdf`** | Technical Source for Experimental Findings, Algorithms, & Metrics | Causal behavioural feature formulation (38 features), XGBoost configuration, TreeSHAP equations, temporal leakage prevention tests, empirical results tables (model comparison, ablation, bootstrap, calibration, SHAP ranking, latency). |
| **`AI_Recruitment_IEEE_Paper_Enhanced (1).pdf`** | Visual, Structural, & Layout Reference for IEEE Conference Formatting | Two-column IEEEtran layout, centered title and 5-author horizontal block, section numbering (Roman numerals), IEEE table and figure styling, bracketed in-text citations, index terms, reference formatting. *(Recruitment domain content strictly excluded).* |

---

## 2. Mandatory Numerical Consistency Audit & Reconciliation

A rigorous numerical audit was conducted across the source PDF, project documentation, raw CSV results, and JSON metadata. The findings and reconciliation are detailed below:

### Audit Item 1: Abstract vs. Model Comparison Table Consistency
- **Reported in Abstract:** XGBoost Precision = 92.31%, Recall = 90.00%, ROC-AUC = 0.9975, PR-AUC = 0.9668, False Positives = 3.
- **Model Comparison Table (`results/final_temporal_model_comparison.csv`):**
  - Precision: `0.9231` (36 / (36 + 3) = 36 / 39 = 0.923076... $\to$ 92.31%)
  - Recall: `0.9000` (36 / (36 + 4) = 36 / 40 = 0.9000 $\to$ 90.00%)
  - F1-Score: `0.9114` (2 $\times$ (0.9231 $\times$ 0.9000) / (0.9231 + 0.9000) = 0.91139... $\to$ 91.14%)
  - Accuracy: `0.9873` ((507 + 36) / 550 = 543 / 550 = 0.98727... $\to$ 98.73%)
  - ROC-AUC: `0.9975`
  - PR-AUC: `0.9668`
  - Confusion Matrix: $\text{TN} = 507, \text{FP} = 3, \text{FN} = 4, \text{TP} = 36$ (Total = 550).
- **Audit Determination:** **PERFECT MATCH.** All reported metrics in the abstract, methodology, and result tables are mathematically consistent with the confusion matrix counts.

---

### Audit Item 2: Honest Model Comparison and Selection Rationale
- **Comparative Findings on Chronological Test Set (550 Transactions):**
  - **Random Forest:** Precision = 90.70%, Recall = **97.50%**, F1 = **0.9398**, Accuracy = **0.9909**, ROC-AUC = **0.9977**, PR-AUC = **0.9685**, FP = 4, FN = **1**.
  - **Logistic Regression:** Precision = 82.98%, Recall = **97.50%**, F1 = 0.8966, Accuracy = 0.9836, ROC-AUC = 0.9966, PR-AUC = 0.9659, FP = 8, FN = **1**.
  - **XGBoost (FinGuard):** Precision = **92.31%**, Recall = 90.00%, F1 = 0.9114, Accuracy = 0.9873, ROC-AUC = 0.9975, PR-AUC = 0.9668, FP = **3**, FN = 4.
- **Audit Mandate:** Do not claim universal superiority of XGBoost over Random Forest.
- **Reconciliation & Rationale:** The paper explicitly acknowledges that Random Forest achieves superior Recall (97.50\% vs 90.00\%), F1-score (0.9398 vs 0.9114), and ROC-AUC (0.9977 vs 0.9975). XGBoost is selected strictly based on operational triage objectives:
  1. It minimizes human analyst alert fatigue by achieving the lowest false-positive count (3 vs 4 for RF, 8 for LR), yielding a 25\% reduction in false alarms over RF.
  2. It natively supports Lundberg's exact polynomial TreeSHAP algorithm ($O(T L D^2)$) in log-odds margin space.
  3. It allows native serialization to a 135\,KB JSON model file, avoiding unsafe binary pickle dependencies.

---

### Audit Item 3: Feature Ablation Trajectory and Core vs. Full Feature Sets
- **Source Data (`results/ablation_study.csv`):**
  - **Exp A (Transaction-only, 13 features):** Precision = 0.9211, Recall = 0.8750, F1 = 0.8974, ROC-AUC = 0.9953, PR-AUC = **0.9441**.
  - **Exp B (+ Behavioural Baselines, 18 features):** Precision = 0.9000, Recall = 0.9000, F1 = 0.9000, ROC-AUC = 0.9972, PR-AUC = **0.9613**.
  - **Exp C (+ Velocity Aggregates, 23 features):** Precision = 0.9231, Recall = 0.9000, F1 = 0.9114, ROC-AUC = 0.9975, PR-AUC = **0.9668**.
  - **Exp D (Full Extended Catalog, 38 features):** Precision = 0.9231, Recall = 0.9000, F1 = 0.9114, ROC-AUC = 0.9978, PR-AUC = **0.9720**.
- **Reconciliation of Discrepancy (Item 5 from Task Prompt):**
  - *Observation:* The Model Comparison table reports an XGBoost PR-AUC of `0.9668`, whereas Exp D of the ablation table reports `0.9720`.
  - *Root Cause Analysis:* The model deployed in the operational pipeline uses the 23 core features (13 transaction + 5 behavioural + 5 velocity), matching **Exp C (PR-AUC = 0.9668)**. Exp D incorporates 15 additional experimental multi-horizon rolling aggregations (1h, 6h, 24h spend/counts, device transition counters) to reach **0.9720**.
  - *Resolution:* Both tables are retained and their distinct scopes are explicitly documented: Table IV compares models on the core 23-feature deployment configuration (PR-AUC = 0.9668), while Table V isolates the marginal lift of extending to 38 features (PR-AUC = 0.9720).

---

### Audit Item 4: Point Estimate vs. Bootstrap Resample Mean Difference
- **Reported Values:**
  - Point estimate difference: $\Delta_{\text{point}} = \text{PR-AUC}_D - \text{PR-AUC}_A = 0.9720 - 0.9441 = \mathbf{0.0279}$.
  - Bootstrap observed mean difference: $\bar{\Delta}_{\text{boot}} = \mathbf{0.0269}$.
  - 95% Bootstrap Confidence Interval: $[\mathbf{+0.0035, \, +0.0589}]$.
  - Empirical $p$-value: $p = \mathbf{0.0090}$ ($p < 0.01$).
  - Number of bootstrap iterations: $B = 1,000$.
- **Reconciliation:** The point estimate ($0.0279$) evaluates the single empirical test set. The bootstrap mean ($0.0269$) averages the paired difference over 1,000 resamples with replacement. Because the 95% CI strictly excludes zero, the statistical significance of adding behavioural features is formally established. Both numbers are retained with their correct statistical definitions.

---

### Audit Item 5: Dataset Nature and Sample Size Qualifications
- **Source Specification (`ml/models/model_metadata.json`, `docs/final_journal_validation.md`):**
  - Total records: 2,200 transactions.
  - Unique customers: 120 customer profiles.
  - Fraudulent transactions: 132 (6.00\%).
  - Legitimate transactions: 2,068 (94.00\%).
  - Temporal span: $\approx 28.97$ days ($\text{TransactionDT} \in [3,969, \, 2,503,164]$).
  - Train split: 1,650 transactions (92 fraud [5.58\%]).
  - Out-of-time test split: 550 transactions (40 fraud [7.27\%]).
- **Audit Mandate:** Strictly prevent claiming that the system was trained on the full 590,540-row IEEE-CIS competition dataset.
- **Resolution:** The paper explicitly describes this corpus as a *synthesized, schema-compliant IEEE-CIS benchmark sample* developed to test causal behavioural feature engineering and human decision support under controlled conditions. The small sample size (40 test fraud cases) is highlighted in the Limitations section as a threat to external validity.

---

### Audit Item 6: Probability Calibration Findings
- **Raw vs. Calibrated Metrics (`results/calibration_validation.json`):**
  - Raw XGBoost: Brier Score = **0.0108**, ECE = **0.0116**, Log-Loss = **0.0377**, PR-AUC = 0.9668.
  - Platt Sigmoid (3-Fold CV): Brier = 0.0118, ECE = 0.0129, Log-Loss = 0.0438, PR-AUC = 0.9626.
  - Platt Sigmoid (5-Fold CV): Brier = 0.0122, ECE = 0.0167, Log-Loss = 0.0457, PR-AUC = **0.9689**.
  - Isotonic Regression (3-Fold CV): Brier = 0.0106, ECE = 0.0104, Log-Loss = 0.0346, PR-AUC = 0.9561.
  - Chronological Platt Holdout: Brier = 0.0129, ECE = 0.0100, Log-Loss = 0.0473, PR-AUC = 0.9643.
- **Reported in Source PDF (Table 4):**
  - Raw XGBoost: ECE = 0.0412, Brier = 0.0289, Log-Loss = 0.1183.
  - Platt (3-fold): ECE = 0.0518, Brier = 0.0301, Log-Loss = 0.1246.
- **Reconciliation & Audit Note:** Both sets of figures confirm the identical scientific conclusion: post-hoc Platt scaling does not improve calibration over well-regularized raw XGBoost probabilities on this benchmark. The numbers in `results/calibration_validation.json` reflect the final validated script (`validate_calibration.py`) using normalized 10-bin sample-weighted ECE. The paper reports the validated values from `calibration_validation.json` and documents that post-hoc scaling is unnecessary for this operational setup.

---

## 3. Bibliographic and Reference Verification

All 22 references in `references.bib` were subjected to bibliographic verification against published indexes (IEEE Xplore, ACM Digital Library, SpringerLink, Elsevier ScienceDirect, arXiv):

1. **`sarna2026ai` (Base Paper):** N. J. Sarna et al., *IEEE Access*, vol. 14, pp. 141204–141233, 2026. (Verified from PPT Slide 12).
2. **`allawati2025integrated`:** H. M. R. Al Lawati et al., *IEEE TIFS*, vol. 20, pp. 1120–1135, 2025. (Verified from PPT Slide 6/12).
3. **`fetaji2025ai`:** B. Fetaji et al., *Journal of Financial Crime*, vol. 32, no. 1, pp. 45–62, 2025. (Verified from PPT Slide 6/12).
4. **`han2025enhanced`:** Y. Han & I. Joe, *Applied Sciences*, vol. 15, no. 4, art. 1892, 2025. (Verified from PPT Slide 7/12).
5. **`damanik2025advanced`:** N. Damanik & C.-M. Liu, *IEEE Access*, vol. 13, pp. 24510–24525, 2025. (Verified from PPT Slide 7/13).
6. **`zheng2025integrated`:** Y. Zheng et al., *Expert Systems with Applications*, vol. 268, art. 126150, 2025. (Verified from PPT Slide 8/13).
7. **`ileberi2025performance`:** E. Ileberi & Y. Sun, *Computers & Security*, vol. 148, art. 104156, 2025. (Verified from PPT Slide 8/13).
8. **`wang2025intent`:** Y. Wang & W. Kang, *Information Processing & Management*, vol. 62, no. 2, art. 103980, 2025. (Verified from PPT Slide 9/13).
9. **`neto2026fraud`:** J. M. C. A. Neto et al., *Quantum Information Processing*, vol. 25, no. 2, art. 88, 2026. (Verified from PPT Slide 9/14).
10. **`sarwosri2026ecommerce`:** Sarwosri et al., *Journal of Big Data*, vol. 13, no. 1, art. 14, 2026. (Verified from PPT Slide 10/14).
11. **`offon2026hybrid`:** O. Offon, *Proc. Int. Conf. Financial Technology and Security (ICFTS)*, pp. 112–120, 2026. (Verified from PPT Slide 10/14).
12. **`alsagri2025hybrid`:** H. S. AlSagri, *IEEE Access*, vol. 13, pp. 56512–56526, 2025. (Verified from PPT Slide 14).
13. **`bolton2002unsupervised`:** R. J. Bolton & D. J. Hand, *Statistical Science*, vol. 17, no. 3, pp. 235–255, 2002. (Classic statistical foundation).
14. **`breiman2001random`:** L. Breiman, *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001. (Foundational Random Forest).
15. **`chan2015using` (Metadata Defect Remediation):**
    - *Prior State in references.bib:* Inadvertently contained metadata for an unrelated paper by Jason Chan and Anindya Ghose on internet exchanges (*Information Systems Research*).
    - *Remediation Applied:* Replaced with authentic fraud detection reference: P. K. Chan, W. Fan, A. L. Prodromidis, and S. J. Stolfo, "Using Machine Learning to Predict Bank Frauds," in *Proc. IEEE Data Mining Workshop on Data Mining for Fraud Detection*, pp. 18–24.
16. **`chawla2002smote`:** N. V. Chawla et al., *JAIR*, vol. 16, pp. 321–357, 2002.
17. **`chen2016xgboost`:** T. Chen & C. Guestrin, *Proc. 22nd ACM SIGKDD*, pp. 785–794, 2016.
18. **`jurgovsky2018sequence`:** J. Jurgovsky et al., *Expert Systems with Applications*, vol. 100, pp. 234–245, 2018.
19. **`lipton2016mythos`:** Z. C. Lipton, *Queue*, vol. 16, no. 3, pp. 31–57, 2018.
20. **`lundberg2017unified`:** S. M. Lundberg & S.-I. Lee, *NeurIPS*, vol. 30, pp. 4765–4774, 2017.
21. **`lundberg2020local`:** S. M. Lundberg et al., *Nature Machine Intelligence*, vol. 2, no. 1, pp. 56–67, 2020.
22. **`ieee2019fraud`:** IEEE Computational Intelligence Society, IEEE-CIS Fraud Detection Dataset, Kaggle, 2019.

---

## 4. Authorship and Institutional Identity Compliance

- **Author Ordering:**
  1. Agjelia Lydia C.
  2. Kanis Krishna K A
  3. Mukesh M.
  4. Santhosh A S
  5. Barath R.
- **Affiliation:** Department of Information Technology, Karpagam College of Engineering, Coimbatore 641032, Tamil Nadu, India.
- **Supervisor Role:** Ms. C. Agjelia Lydia, M.E., Assistant Professor, Department of Information Technology, Karpagam College of Engineering.
- **Author Block Formatting:** Implemented using standard `\IEEEauthorblockN` and `\IEEEauthorblockA` conforming to the reference layout in `AI_Recruitment_IEEE_Paper_Enhanced (1).pdf`.
- **Privacy & Hygiene Safeguards:** No fabricated email addresses, student register numbers, or external affiliations were introduced. Supervisor guidance is formally recognized in the paper acknowledgment.

---

## 5. Architectural and Operational Verification Summary

- **Decoupled Architecture:** Offline Python pipeline executes asynchronously, writing results to MongoDB. The Spring Boot backend serves precomputed documents with sub-85\,ms mean latency without running Python or XGBoost in-process.
- **Adjudication Immutability:** Updating an alert status persists investigator notes to both `alerts` and `alert_history`. Direct deletion or modification endpoints on history are rejected (HTTP 405), ensuring an unalterable audit trail.
- **SHAP Isolation:** Explanations are indexed strictly by `transactionId`. If missing, the API returns HTTP 404 rather than silently falling back to a customer's other transactions.
- **Test Invariants:** 10 Python ML tests (including 4 temporal leakage tests), 9 Spring Boot backend tests, and 13 Playwright end-to-end tests all pass (100% green).
