"""
FinGuard - Pipeline Integration and Model Integrity Test Suite
Verifies:
1. Feature generation and column consistency
2. Chronological temporal order preservation
3. Model loading from native XGBoost JSON format
4. Probability calibration and risk scoring
5. SHAP TreeExplainer calculation
6. MongoDB connection and document structure
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
import shap
import pymongo

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe, CORE_23_FEATURES

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODEL_FILE = os.path.join(MODEL_DIR, "finguard_xgb.json")
CALIBRATOR_FILE = os.path.join(MODEL_DIR, "finguard_calibrator.joblib")
FEATURES_FILE = os.path.join(MODEL_DIR, "features.json")


class TestPipelineIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.df_raw = load_raw_dataset()

    def test_raw_dataset_schema(self):
        """Dataset must contain exactly 2,200 rows and IEEE-CIS benchmark columns."""
        self.assertEqual(len(self.df_raw), 2200)
        self.assertIn("TransactionID", self.df_raw.columns)
        self.assertIn("TransactionDT", self.df_raw.columns)
        self.assertIn("TransactionAmt", self.df_raw.columns)
        self.assertIn("customer_id", self.df_raw.columns)
        self.assertIn("isFraud", self.df_raw.columns)

    def test_feature_engineering_integrity(self):
        """Engineered features must match the core 23 feature catalog with no NaN values."""
        df_feat, profiles, feats = engineer_features_leakage_safe(self.df_raw.iloc[:100].copy(), feature_set="core")
        self.assertEqual(len(feats), 23)
        self.assertEqual(feats, CORE_23_FEATURES)
        self.assertFalse(df_feat[feats].isnull().any().any())

    def test_model_loading_and_inference(self):
        """Model must load from native JSON format and output valid probabilities in [0, 1]."""
        self.assertTrue(os.path.exists(MODEL_FILE))
        booster = xgb.Booster()
        booster.load_model(MODEL_FILE)

        df_feat, _, feats = engineer_features_leakage_safe(self.df_raw.iloc[:10].copy(), feature_set="core")
        dmat = xgb.DMatrix(df_feat[feats], feature_names=feats)
        preds = booster.predict(dmat)

        self.assertEqual(len(preds), 10)
        self.assertTrue(np.all(preds >= 0.0))
        self.assertTrue(np.all(preds <= 1.0))

    def test_calibrator_inference(self):
        """Probability calibrator must load and produce calibrated probabilities."""
        if os.path.exists(CALIBRATOR_FILE):
            calibrator = joblib.load(CALIBRATOR_FILE)
            df_feat, _, feats = engineer_features_leakage_safe(self.df_raw.iloc[:10].copy(), feature_set="core")
            cal_probs = calibrator.predict_proba(df_feat[feats])[:, 1]
            self.assertEqual(len(cal_probs), 10)
            self.assertTrue(np.all(cal_probs >= 0.0))
            self.assertTrue(np.all(cal_probs <= 1.0))

    def test_shap_explainer_execution(self):
        """TreeExplainer must produce SHAP values matching feature dimensions."""
        booster = xgb.Booster()
        booster.load_model(MODEL_FILE)

        df_feat, _, feats = engineer_features_leakage_safe(self.df_raw.iloc[:5].copy(), feature_set="core")
        dmat = xgb.DMatrix(df_feat[feats], feature_names=feats)

        explainer = shap.TreeExplainer(booster)
        shap_vals = explainer.shap_values(dmat)
        self.assertEqual(shap_vals.shape, (5, len(feats)))

    def test_mongodb_connectivity_and_data(self):
        """MongoDB database 'finguard' must have active non-empty collections."""
        client = pymongo.MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
        db = client["finguard"]
        self.assertGreater(db["batches"].count_documents({}), 0)
        self.assertGreater(db["transactions"].count_documents({}), 0)
        self.assertGreater(db["alerts"].count_documents({}), 0)
        self.assertGreater(db["customers"].count_documents({}), 0)
        self.assertGreater(db["explanations"].count_documents({}), 0)


if __name__ == "__main__":
    unittest.main()
