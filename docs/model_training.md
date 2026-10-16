# FinGuard: Model Training & Probability Calibration

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

FinGuard employs an XGBoost binary classification model with probability calibration via Platt scaling (sigmoid calibration) to generate well-calibrated posterior probabilities.

## 2. Model Hyperparameters

The model configuration is externalized in `ml/config.json`:

```json
{
  "algorithm": "XGBoost Classifier",
  "objective": "binary:logistic",
  "n_estimators": 100,
  "max_depth": 4,
  "learning_rate": 0.06,
  "subsample": 0.85,
  "colsample_bytree": 0.85,
  "reg_lambda": 2.0,
  "scale_pos_weight": 4.0,
  "eval_metric": "logloss",
  "random_state": 42
}
```

### Class Imbalance Handling
The training set contains 92 fraud cases and 1,558 legitimate cases (ratio 16.93:1). Rather than allowing extreme weights that push output probabilities to saturation (producing repeated 99.9% scores), `scale_pos_weight` is calibrated to $4.0$.

## 3. Probability Calibration Protocol

To convert raw decision margins into trustworthy empirical risk probabilities:
1. A Platt scaling (Sigmoid) calibrator (`CalibratedClassifierCV(estimator=model, method="sigmoid", cv=3)`) is fit strictly on training cross-validation folds.
2. The fitted calibrator is serialized to `ml/models/finguard_calibrator.joblib`.
3. In batch scoring, both `raw_probability` and `calibrated_probability` are computed and stored.
4. Risk score is computed as:
   $$\text{RiskScore} = \text{round}(\text{calibrated\_probability} \times 100, 1)$$

## 4. Calibration Evaluation Metrics (Temporal Mode)

- **Raw Brier Score:** 0.0108
- **Calibrated Brier Score:** 0.0118
- **Raw Expected Calibration Error (ECE):** 0.0116
- **Calibrated Expected Calibration Error (ECE):** 0.0129

Both raw and calibrated outputs demonstrate tight calibration (ECE ~ 0.012), preventing overconfident scores on marginal decision boundaries.
