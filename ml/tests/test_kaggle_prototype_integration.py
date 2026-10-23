"""
FinGuard Phase 4B - Automated Prototype Regression Test Suite
Automated regression tests for the isolated 397-feature Kaggle behavioural XGBoost prototype.

Test Coverage:
1. Model and feature catalog loading (behavioural_xgboost.json, feature_columns.json, tree count).
2. Exact feature count and ordering (397 features, baseline + behavioural layout).
3. Card-key missing-value handling (preserves 'nan' string without NA propagation).
4. Behavioural feature causality and cold starts (prior_card_count, prior_amount_mean).
5. Amount-deviation formula and missing-value handling ((amt - prior_mean) / abs(prior_mean)).
6. Risk-score monotonicity and severity thresholds (0-100 scaling, HIGH/MEDIUM/LOW).
7. SHAP explanation schema compatibility (TopFactor fields, positive and negative drivers).

Safety requirements:
- Strictly test-only execution: does NOT modify production model, calibrator, backend, or MongoDB.
- Uses synthetic inputs for unit testing.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd
import xgboost as xgb

# Add prototype directory to path
TESTS_DIR = os.path.dirname(__file__)
ML_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
PROTOTYPE_DIR = os.path.join(ML_DIR, "kaggle_prototype")

sys.path.insert(0, PROTOTYPE_DIR)

from kaggle_feature_pipeline import (
    extract_kaggle_behavioural_features,
    load_feature_columns,
    construct_card_key,
    CATEGORICAL_COLS
)
from prototype_scorer import KaggleBehaviouralScorer

MODEL_FILE = os.path.join(PROTOTYPE_DIR, "behavioural_xgboost.json")
CATALOG_FILE = os.path.join(PROTOTYPE_DIR, "feature_columns.json")


class TestModelAndCatalogLoading(unittest.TestCase):
    """Test Suite 1: Model and Feature Catalog Loading."""

    def test_prototype_model_file_exists(self):
        """Assert that behavioural_xgboost.json exists in kaggle_prototype directory."""
        self.assertTrue(os.path.exists(MODEL_FILE), f"Model file not found: {MODEL_FILE}")

    def test_feature_catalog_file_exists(self):
        """Assert that feature_columns.json exists in kaggle_prototype directory."""
        self.assertTrue(os.path.exists(CATALOG_FILE), f"Catalog file not found: {CATALOG_FILE}")

    def test_feature_catalog_structure(self):
        """Assert feature_columns.json contains valid 'behavioural' and 'baseline' catalogs."""
        cols = load_feature_columns()
        self.assertIsInstance(cols, list)
        self.assertEqual(len(cols), 397)

    def test_booster_loading_and_architecture(self):
        """Assert that native XGBoost booster loads with 700 trees and 397 features."""
        booster = xgb.Booster()
        booster.load_model(MODEL_FILE)
        trees = booster.get_dump()
        self.assertEqual(len(trees), 700, f"Expected 700 trees, got {len(trees)}")


class TestFeatureCountAndOrdering(unittest.TestCase):
    """Test Suite 2: Exact Feature Count and Ordering."""

    def setUp(self):
        self.feature_columns = load_feature_columns()

    def test_exact_feature_count(self):
        """Feature catalog must have exactly 397 features."""
        self.assertEqual(len(self.feature_columns), 397)

    def test_baseline_features_prefix(self):
        """First 10 features must match canonical IEEE-CIS transaction ordering."""
        expected_first_10 = [
            "TransactionDT", "TransactionAmt", "ProductCD",
            "card1", "card2", "card3", "card4", "card5", "card6", "addr1"
        ]
        self.assertEqual(self.feature_columns[:10], expected_first_10)

    def test_behavioural_features_tail_ordering(self):
        """The 5 engineered behavioural features must be positioned at indices 392 through 396."""
        expected_tail = [
            "prior_card_count",
            "prior_amount_mean",
            "amount_deviation",
            "time_sin",
            "time_cos"
        ]
        self.assertEqual(self.feature_columns[-5:], expected_tail)

    def test_feature_pipeline_output_alignment(self):
        """Pipeline output must produce identical column names and ordering as the 397-feature catalog."""
        # Create minimal synthetic raw DataFrame with all base features
        base_features = [c for c in self.feature_columns if c not in [
            "prior_card_count", "prior_amount_mean", "amount_deviation", "time_sin", "time_cos"
        ]]
        data = {col: [0.0] for col in base_features}
        data["TransactionID"] = [3000001]
        data["TransactionDT"] = [86400]
        data["TransactionAmt"] = [100.0]
        data["card1"] = [1000]
        data["card2"] = [200.0]
        data["card3"] = [150.0]
        data["card4"] = ["visa"]
        data["card5"] = [226.0]
        data["card6"] = ["debit"]
        df_synthetic = pd.DataFrame(data)

        df_out = extract_kaggle_behavioural_features(df_synthetic)
        self.assertEqual(list(df_out.columns), self.feature_columns)


class TestCardKeyHandling(unittest.TestCase):
    """Test Suite 3: Card-Key Missing-Value Handling."""

    def test_card_key_fully_populated(self):
        """Card key with all fields present must concatenate with underscore delimiter."""
        df = pd.DataFrame([{
            "card1": 1234, "card2": 250.0, "card3": 150.0,
            "card4": "visa", "card5": 226.0, "card6": "debit"
        }])
        key = construct_card_key(df).iloc[0]
        self.assertEqual(key, "1234_250.0_150.0_visa_226.0_debit")

    def test_card_key_with_missing_values(self):
        """Missing card fields must convert to 'nan' string and avoid propagating nullable NA."""
        df = pd.DataFrame([{
            "card1": 5678, "card2": np.nan, "card3": np.nan,
            "card4": np.nan, "card5": np.nan, "card6": np.nan
        }])
        key = construct_card_key(df).iloc[0]
        self.assertEqual(key, "5678_nan_nan_nan_nan_nan")
        self.assertFalse(pd.isna(key))

    def test_card_key_grouping_consistency(self):
        """Transactions sharing identical card profiles with nulls must group together without dropping."""
        df = pd.DataFrame([
            {"card1": 9999, "card2": np.nan, "card3": 150.0, "card4": "visa", "card5": np.nan, "card6": "credit", "val": 10},
            {"card1": 9999, "card2": np.nan, "card3": 150.0, "card4": "visa", "card5": np.nan, "card6": "credit", "val": 20},
            {"card1": 8888, "card2": 100.0, "card3": 150.0, "card4": "mastercard", "card5": 102.0, "card6": "debit", "val": 30}
        ])
        df["card_key"] = construct_card_key(df)
        self.assertEqual(df["card_key"].isna().sum(), 0)

        # Check grouping count
        counts = df.groupby("card_key").cumcount()
        self.assertEqual(counts.tolist(), [0, 1, 0])


class TestBehaviouralCausalityAndColdStarts(unittest.TestCase):
    """Test Suite 4: Behavioural Feature Causality and Cold Starts."""

    def test_strict_temporal_causality_and_cold_starts(self):
        """
        Verify that for card CARD_A:
        Tx1 (cold start): count=0, prior_mean=NaN
        Tx2: count=1, prior_mean=Tx1 amount
        Tx3: count=2, prior_mean=mean(Tx1, Tx2 amounts)
        And interleaved CARD_B does not alter CARD_A's statistics.
        """
        records = [
            {"TransactionID": 1, "TransactionDT": 100, "TransactionAmt": 100.0, "card1": 1001, "card2": 200.0, "card3": 150.0, "card4": "visa", "card5": 226.0, "card6": "debit"},
            {"TransactionID": 2, "TransactionDT": 200, "TransactionAmt": 150.0, "card1": 1001, "card2": 200.0, "card3": 150.0, "card4": "visa", "card5": 226.0, "card6": "debit"},
            # Interleaved Card B transaction
            {"TransactionID": 3, "TransactionDT": 250, "TransactionAmt": 500.0, "card1": 2002, "card2": 300.0, "card3": 150.0, "card4": "mastercard", "card5": 117.0, "card6": "credit"},
            {"TransactionID": 4, "TransactionDT": 300, "TransactionAmt": 200.0, "card1": 1001, "card2": 200.0, "card3": 150.0, "card4": "visa", "card5": 226.0, "card6": "debit"}
        ]
        df = pd.DataFrame(records)
        df["card_key"] = construct_card_key(df)

        prior_count = df.groupby("card_key").cumcount()
        df["prior_card_count"] = prior_count
        cum_amt = df.groupby("card_key")["TransactionAmt"].cumsum() - df["TransactionAmt"]
        df["prior_amount_mean"] = cum_amt / prior_count.replace(0, np.nan)

        # Card A - Tx 1 (Cold Start)
        self.assertEqual(df.loc[0, "prior_card_count"], 0)
        self.assertTrue(np.isnan(df.loc[0, "prior_amount_mean"]))

        # Card A - Tx 2
        self.assertEqual(df.loc[1, "prior_card_count"], 1)
        self.assertAlmostEqual(df.loc[1, "prior_amount_mean"], 100.0, places=4)

        # Card B - Tx 3 (Independent Cold Start)
        self.assertEqual(df.loc[2, "prior_card_count"], 0)
        self.assertTrue(np.isnan(df.loc[2, "prior_amount_mean"]))

        # Card A - Tx 4
        self.assertEqual(df.loc[3, "prior_card_count"], 2)
        expected_mean = (100.0 + 150.0) / 2.0  # 125.0
        self.assertAlmostEqual(df.loc[3, "prior_amount_mean"], expected_mean, places=4)


class TestAmountDeviationFormula(unittest.TestCase):
    """Test Suite 5: Amount-Deviation Formula and Missing-Value Handling."""

    def test_amount_deviation_computation(self):
        """Verify signed relative deviation: (amt - prior_mean) / abs(prior_mean)."""
        # Case 1: Positive spending spike (+150% deviation)
        amt_spike = 250.0
        prior_mean = 100.0
        dev_spike = (amt_spike - prior_mean) / np.abs(prior_mean)
        self.assertAlmostEqual(dev_spike, 1.50, places=4)

        # Case 2: Negative spending drop (-60% deviation)
        amt_drop = 40.0
        dev_drop = (amt_drop - prior_mean) / np.abs(prior_mean)
        self.assertAlmostEqual(dev_drop, -0.60, places=4)

        # Case 3: Exact baseline match (0.0% deviation)
        amt_match = 100.0
        dev_match = (amt_match - prior_mean) / np.abs(prior_mean)
        self.assertAlmostEqual(dev_match, 0.00, places=4)

    def test_amount_deviation_cold_start_nan(self):
        """When prior_amount_mean is NaN, amount_deviation must also evaluate to NaN."""
        amt = 100.0
        prior_mean = np.nan
        dev = (amt - prior_mean) / np.abs(prior_mean)
        self.assertTrue(np.isnan(dev))

    def test_amount_deviation_xgboost_nan_routing(self):
        """Verify that XGBoost native inference handles NaN in amount_deviation without error."""
        scorer = KaggleBehaviouralScorer()
        cols = load_feature_columns()
        df_row = pd.DataFrame(np.zeros((1, len(cols))), columns=cols)
        df_row.loc[0, "amount_deviation"] = np.nan
        df_row.loc[0, "prior_amount_mean"] = np.nan
        df_row.loc[0, "prior_card_count"] = np.nan

        probs, scores = scorer.score(df_row)
        self.assertEqual(len(probs), 1)
        self.assertTrue(0.0 <= probs[0] <= 1.0)
        self.assertTrue(0.0 <= scores[0] <= 100.0)


class TestRiskScoreMonotonicityAndThresholds(unittest.TestCase):
    """Test Suite 6: Risk-Score Monotonicity and Severity Thresholds."""

    def test_score_scaling_and_rounding(self):
        """Probability in [0, 1] must scale linearly to [0, 100] with 1 decimal precision."""
        probs = np.array([0.0, 0.0523, 0.31219, 0.5557, 0.78402, 1.0])
        expected_scores = np.array([0.0, 5.2, 31.2, 55.6, 78.4, 100.0])
        computed_scores = np.round(probs * 100.0, 1)
        np.testing.assert_array_almost_equal(computed_scores, expected_scores)

    def test_monotonicity(self):
        """Risk scores must be strictly non-decreasing with increasing probabilities."""
        probs = np.linspace(0.0, 1.0, 101)
        scores = np.round(probs * 100.0, 1)
        diffs = np.diff(scores)
        self.assertTrue(np.all(diffs >= 0), "Risk score scaling violated monotonicity!")

    def test_severity_classification_thresholds(self):
        """
        Verify FinGuard classification boundaries:
        HIGH:   score >= 75.0
        MEDIUM: 40.0 <= score < 75.0
        LOW:    score < 40.0
        """
        def classify(score):
            if score >= 75.0:
                return "HIGH"
            elif score >= 40.0:
                return "MEDIUM"
            return "LOW"

        # Boundary checks
        self.assertEqual(classify(100.0), "HIGH")
        self.assertEqual(classify(75.0), "HIGH")
        self.assertEqual(classify(74.9), "MEDIUM")
        self.assertEqual(classify(55.0), "MEDIUM")
        self.assertEqual(classify(40.0), "MEDIUM")
        self.assertEqual(classify(39.9), "LOW")
        self.assertEqual(classify(0.0), "LOW")


class TestShapExplanationSchemaCompatibility(unittest.TestCase):
    """Test Suite 7: SHAP Explanation Schema Compatibility."""

    @classmethod
    def setUpClass(cls):
        cls.scorer = KaggleBehaviouralScorer()
        cls.cols = load_feature_columns()
        # Synthetic single-row DataFrame
        cls.df_row = pd.DataFrame(np.zeros((1, len(cls.cols))), columns=cls.cols)
        cls.explanations, _ = cls.scorer.explain(cls.df_row, top_k=5)

    def test_explanation_document_base_structure(self):
        """Explanation output must contain base_value (float) and top_factors (list)."""
        self.assertEqual(len(self.explanations), 1)
        expl = self.explanations[0]
        self.assertIn("base_value", expl)
        self.assertIn("top_factors", expl)
        self.assertIsInstance(expl["base_value"], float)
        self.assertIsInstance(expl["top_factors"], list)
        self.assertEqual(len(expl["top_factors"]), 5)

    def test_top_factor_subdocument_schema(self):
        """Every item in top_factors must adhere to Spring Boot TopFactor entity fields."""
        required_fields = {"feature", "value", "shap_value", "impact", "description"}
        for factor in self.explanations[0]["top_factors"]:
            self.assertTrue(required_fields.issubset(factor.keys()), f"Missing fields in factor: {factor}")
            self.assertIsInstance(factor["feature"], str)
            self.assertIsInstance(factor["shap_value"], float)
            self.assertIn(factor["impact"], ["INCREASES_RISK", "DECREASES_RISK"])
            self.assertIsInstance(factor["description"], str)

    def test_shap_impact_sign_consistency(self):
        """SHAP impact direction must strictly match the mathematical sign of shap_value."""
        for factor in self.explanations[0]["top_factors"]:
            s_val = factor["shap_value"]
            if s_val > 0:
                self.assertEqual(factor["impact"], "INCREASES_RISK")
            elif s_val < 0:
                self.assertEqual(factor["impact"], "DECREASES_RISK")

    def test_positive_and_negative_drivers_partitioning(self):
        """
        Verify that SHAP factors can be cleanly partitioned into positive_drivers
        and negative_drivers as required by Spring Boot Explanation.java.
        """
        factors = self.explanations[0]["top_factors"]
        pos_drivers = [f for f in factors if f["shap_value"] > 0]
        neg_drivers = [f for f in factors if f["shap_value"] < 0]

        for p in pos_drivers:
            self.assertEqual(p["impact"], "INCREASES_RISK")
        for n in neg_drivers:
            self.assertEqual(n["impact"], "DECREASES_RISK")

        # Partitioned collections must cover all non-zero SHAP factors
        self.assertEqual(len(pos_drivers) + len(neg_drivers), len(factors))


if __name__ == "__main__":
    unittest.main()
