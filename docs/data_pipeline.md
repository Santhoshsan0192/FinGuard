# FinGuard: Data Pipeline & Temporal Partitioning

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

The FinGuard data pipeline ingests transaction and identity records, enforces causal behavioral profiling, and performs temporal evaluation without future lookahead.

## 2. Dataset Characteristics

- **Source Dataset:** IEEE-CIS Fraud Detection benchmark subset.
- **Transaction Table:** `ml/data/train_transaction.csv`
- **Identity Table:** `ml/data/train_identity.csv`
- **Total Transactions:** 2,200 transactions
- **Unique Customers:** 120 customers
- **Fraud Distribution:** 132 fraudulent transactions (6.00%), 2,068 legitimate transactions (94.00%)
- **Imbalance Ratio:** 15.67 : 1

## 3. Temporal Evaluation Partitioning

Rather than applying a random stratified split that introduces temporal leakage by intermixing future transactions into earlier training baselines, FinGuard implements a chronological 75% / 25% partition:

```
Transaction Timeline (TransactionDT in seconds)
DT: 3,969 -------------------------------> 1,879,867 | 1,881,234 ----------------> 2,503,164
[<-------------- Training Window (75%) ------------>| <----------- Test Window (25%) --------->]
                   1,650 Transactions                                   550 Transactions
               92 Fraud / 1,558 Legitimate                         40 Fraud / 510 Legitimate
```

### Partition Details
- **Training Period:** `TransactionDT` [3,969 – 1,879,867] (span: ~21.7 days)
- **Testing Period:** `TransactionDT` [1,881,234 – 2,503,164] (span: ~7.2 days)
- **Training Transactions:** 1,650 (Fraud: 92 [5.58%], Legit: 1,558 [94.42%])
- **Testing Transactions:** 550 (Fraud: 40 [7.27%], Legit: 510 [92.73%])

## 4. Leakage Prevention Protocol

To guarantee that future transaction information cannot alter earlier features:
1. The dataset is partitioned chronologically BEFORE feature computation.
2. For training: Baselines and deviation features are computed sequentially per customer using only preceding transactions within the training period.
3. For testing: Historical customer profiles are initialized from the training period. For any test transaction $t_i$, the customer baseline uses only transactions occurring before $t_i$.
4. The target column `isFraud` is strictly excluded from all feature generation functions.
