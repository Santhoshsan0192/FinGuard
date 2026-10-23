"""
FinGuard Phase 3 - Isolated Kaggle Behavioural Model Scorer & Explainer
Scores transaction batches using behavioural_xgboost.json (397 features)
and generates TreeSHAP explainability attributions without touching MongoDB.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import xgboost as xgb
import shap

SANDBOX_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(SANDBOX_DIR, "behavioural_xgboost.json")
FEATURE_COLUMNS_FILE = os.path.join(SANDBOX_DIR, "feature_columns.json")

from kaggle_feature_pipeline import extract_kaggle_behavioural_features, load_feature_columns


class KaggleBehaviouralScorer:
    """
    Isolated scoring and SHAP explainability engine for the 397-feature Kaggle model.
    """

    def __init__(self, model_file=MODEL_FILE):
        self.model_file = model_file
        self.feature_columns = load_feature_columns()
        self.booster = xgb.Booster()
        self.booster.load_model(self.model_file)
        self.explainer = None  # Lazy load

    def _get_explainer(self):
        if self.explainer is None:
            self.explainer = shap.TreeExplainer(self.booster)
        return self.explainer

    def score(self, df_features):
        """
        Computes raw model probabilities and scaled risk scores (0-100).
        df_features must have exactly the 397 columns in expected order.
        """
        dmat = xgb.DMatrix(df_features, feature_names=self.feature_columns)
        probs = self.booster.predict(dmat)
        risk_scores = np.round(probs * 100.0, 1)
        return probs, risk_scores

    def explain(self, df_features, top_k=5):
        """
        Computes TreeSHAP feature attributions in log-odds margin space
        and extracts top_k risk drivers per transaction.
        """
        explainer = self._get_explainer()
        dmat = xgb.DMatrix(df_features, feature_names=self.feature_columns)
        
        t0 = time.time()
        shap_values = explainer.shap_values(dmat)
        shap_time = time.time() - t0

        base_val = float(explainer.expected_value) if hasattr(explainer, "expected_value") else 0.0

        explanations = []
        for i in range(len(df_features)):
            row_shaps = shap_values[i]
            row_vals = df_features.iloc[i].values

            # Sort by absolute impact
            abs_shaps = np.abs(row_shaps)
            top_indices = np.argsort(abs_shaps)[::-1][:top_k]

            top_factors = []
            for idx in top_indices:
                feat_name = self.feature_columns[idx]
                feat_val = float(row_vals[idx]) if not np.isnan(row_vals[idx]) else None
                s_val = float(row_shaps[idx])
                impact = "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK"

                desc = self._format_description(feat_name, feat_val, s_val, impact)

                top_factors.append({
                    "feature": feat_name,
                    "value": round(feat_val, 4) if feat_val is not None else None,
                    "shap_value": round(s_val, 4),
                    "impact": impact,
                    "description": desc
                })

            explanations.append({
                "base_value": round(base_val, 4),
                "top_factors": top_factors
            })

        return explanations, shap_time

    def _format_description(self, feat_name, val, shap_val, impact):
        direction = "increases" if shap_val > 0 else "mitigates"

        if feat_name == "amount_deviation":
            if val is not None:
                pct = val * 100.0
                return f"Amount deviates by {pct:+.1f}% from card historical mean ({direction} risk)"
            return "Transaction amount deviation from card baseline"

        if feat_name == "prior_amount_mean":
            if val is not None:
                return f"Card prior average transaction volume: ${val:,.2f}"
            return "Card has no prior transaction history (cold start)"

        if feat_name == "prior_card_count":
            if val is not None:
                if val == 0:
                    return "First observed transaction for this card profile (cold start)"
                return f"Card has {int(val)} recorded historical transactions"
            return "Prior card velocity count"

        if feat_name in ("time_sin", "time_cos"):
            return f"Diurnal cyclical transaction timing factor ({feat_name} = {val:.3f})"

        if feat_name == "TransactionAmt":
            return f"Transaction amount: ${val:,.2f} ({direction} risk by {abs(shap_val):.3f})"

        if feat_name.startswith("V"):
            return f"Vesta behavioural fraud indicator {feat_name} = {val} ({direction} risk)"

        if feat_name.startswith("C"):
            return f"Card association counter {feat_name} = {int(val) if val is not None else 'N/A'}"

        if feat_name.startswith("D"):
            return f"Timedelta interval {feat_name} = {val:.1f} days"

        return f"{feat_name} = {val} ({direction} risk by {abs(shap_val):.3f})"
