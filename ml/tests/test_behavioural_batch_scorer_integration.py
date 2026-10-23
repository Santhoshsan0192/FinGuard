"""
FinGuard Isolated Behavioural Model Integration - Automated Integration Test Suite
Verifies the complete isolated behavioural batch scorer, input validator,
calibrator safety guard, causal leakage prevention, and explanation adapter.

Strict safety:
- Does NOT connect to or modify production MongoDB 'finguard'.
- Does NOT modify production model artifacts or calibrators.
- Uses synthetic test data for deterministic unit testing.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd
import xgboost as xgb

# Set up paths
TESTS_DIR = os.path.dirname(__file__)
ML_DIR = os.path.abspath(os.path.join(TESTS_DIR, ".."))
PROTOTYPE_DIR = os.path.join(ML_DIR, "kaggle_prototype")

sys.path.insert(0, PROTOTYPE_DIR)

from input_validator import (
    validate_raw_transaction_input,
    get_required_raw_columns,
    SchemaValidationError
)
from explanation_adapter import (
    format_feature_description,
    get_feature_display_title,
    determine_primary_risk_driver,
    adapt_single_explanation,
    adapt_global_importance
)
from behavioural_batch_scorer import (
    BehaviouralBatchScorer,
    BatchExecutionResult,
    CalibratorIncompatibilityError
)
from kaggle_feature_pipeline import load_feature_columns


def create_synthetic_raw_dataframe(n_rows=5, base_dt=1000):
    """
    Creates a valid synthetic raw transaction DataFrame containing all 392 baseline columns
    plus TransactionID and isFraud.
    """
    required_cols = get_required_raw_columns()
    data = {}

    data["TransactionID"] = [3000000 + i for i in range(n_rows)]
    data["isFraud"] = [0] * n_rows
    if n_rows > 2:
        data["isFraud"][1] = 1  # 1 fraud case

    for col in required_cols:
        if col == "TransactionDT":
            data[col] = [base_dt + i * 3600 for i in range(n_rows)]
        elif col == "TransactionAmt":
            data[col] = [100.0 + i * 25.0 for i in range(n_rows)]
        elif col == "ProductCD":
            data[col] = ["W"] * n_rows
        elif col.startswith("card"):
            if col in ("card1", "card2", "card3", "card5"):
                data[col] = [1000] * n_rows
            else:
                data[col] = ["visa"] * n_rows
        elif col in ("P_emaildomain", "R_emaildomain"):
            data[col] = ["gmail.com"] * n_rows
        elif col.startswith("M"):
            data[col] = ["T"] * n_rows
        elif col.startswith("addr"):
            data[col] = [300.0] * n_rows
        elif col.startswith("dist"):
            data[col] = [15.0] * n_rows
        elif col.startswith("C"):
            data[col] = [1.0] * n_rows
        elif col.startswith("D"):
            data[col] = [0.0] * n_rows
        elif col.startswith("V"):
            data[col] = [1.0] * n_rows
        else:
            data[col] = [0.0] * n_rows

    return pd.DataFrame(data)


class TestInputValidator(unittest.TestCase):
    """Test Suite 1: Raw Input Schema Validation."""

    def test_validation_success_on_valid_dataframe(self):
        """Valid synthetic DataFrame with 392 baseline cols + TransactionID must pass validation."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        valid, missing = validate_raw_transaction_input(df)
        self.assertTrue(valid)
        self.assertEqual(len(missing), 0)

    def test_validation_fails_on_missing_columns(self):
        """Omitting required columns (e.g. dist1, V10, V20) must raise SchemaValidationError."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        df_dropped = df.drop(columns=["dist1", "V10", "V20"])
        with self.assertRaises(SchemaValidationError) as ctx:
            validate_raw_transaction_input(df_dropped)
        err = ctx.exception
        self.assertEqual(err.missing_count, 3)
        self.assertIn("dist1", err.missing_columns)
        self.assertIn("V10", err.missing_columns)
        self.assertIn("V20", err.missing_columns)

    def test_validation_fails_on_missing_transaction_id(self):
        """Omitting TransactionID must raise SchemaValidationError when required."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        df_no_id = df.drop(columns=["TransactionID"])
        with self.assertRaises(SchemaValidationError):
            validate_raw_transaction_input(df_no_id, require_transaction_id=True)

    def test_validation_fails_on_non_dataframe_or_empty(self):
        """Passing non-DataFrame or empty DataFrame must raise SchemaValidationError."""
        with self.assertRaises(SchemaValidationError):
            validate_raw_transaction_input("not_a_dataframe")
        with self.assertRaises(SchemaValidationError):
            validate_raw_transaction_input(pd.DataFrame())


class TestCalibratorSafetyGuard(unittest.TestCase):
    """Test Suite 2: Strict Prevention of 23-Feature Calibrator Invocations."""

    def setUp(self):
        self.scorer = BehaviouralBatchScorer()

    def test_calibrator_safety_guard_blocks_foreign_calibrator(self):
        """Passing any calibrator object to score() must raise CalibratorIncompatibilityError."""
        df_features = pd.DataFrame(
            np.zeros((2, 397)),
            columns=self.scorer.feature_columns
        )
        dummy_calibrator = "finguard_calibrator.joblib"
        with self.assertRaises(CalibratorIncompatibilityError) as ctx:
            self.scorer.score(df_features, calibrator=dummy_calibrator)
        self.assertIn("Cannot pass 397-feature inputs into a calibrator", str(ctx.exception))


class TestCausalLeakagePrevention(unittest.TestCase):
    """Test Suite 3: Causal Behavioural Feature Engineering."""

    def setUp(self):
        self.scorer = BehaviouralBatchScorer()

    def test_causal_cumcount_and_amount_mean_within_batch(self):
        """
        Verify that prior_card_count starts at 0 for the first transaction and
        prior_amount_mean evaluates strictly before current transaction.
        """
        df = create_synthetic_raw_dataframe(n_rows=4)
        # All 4 transactions have same card attributes
        # Amounts: 100, 125, 150, 175
        features = self.scorer.extract_features(df)

        counts = features["prior_card_count"].tolist()
        self.assertEqual(counts, [0, 1, 2, 3])

        # Transaction 0: cold start -> prior_amount_mean is NaN
        self.assertTrue(np.isnan(features.iloc[0]["prior_amount_mean"]))
        # Transaction 1: prior mean is 100.0
        self.assertAlmostEqual(features.iloc[1]["prior_amount_mean"], 100.0, places=4)
        # Transaction 2: prior mean is (100 + 125) / 2 = 112.5
        self.assertAlmostEqual(features.iloc[2]["prior_amount_mean"], 112.5, places=4)
        # Transaction 3: prior mean is (100 + 125 + 150) / 3 = 125.0
        self.assertAlmostEqual(features.iloc[3]["prior_amount_mean"], 125.0, places=4)

    def test_chronological_ordering_enforced_against_out_of_order_input(self):
        """Transactions passed out of order must be sorted by (TransactionDT, TransactionID)."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        # Reverse order: t=1002, t=1001, t=1000
        df_reversed = df.iloc[::-1].copy().reset_index(drop=True)
        features = self.scorer.extract_features(df_reversed)

        # After extraction, features must be chronologically ordered
        self.assertEqual(features["prior_card_count"].tolist(), [0, 1, 2])

    def test_cross_batch_prior_history_causality(self):
        """Historical data from prior batches must pre-seed velocity counters without leaking."""
        prior_history = create_synthetic_raw_dataframe(n_rows=2, base_dt=500)
        # Prior history has 2 transactions: t=500 ($100), t=4100 ($125) -> mean = 112.5
        new_batch = create_synthetic_raw_dataframe(n_rows=2, base_dt=10000)

        features = self.scorer.extract_features(new_batch, prior_history_df=prior_history)

        self.assertEqual(len(features), 2)
        # First transaction in new batch should have count = 2
        self.assertEqual(features.iloc[0]["prior_card_count"], 2)
        self.assertAlmostEqual(features.iloc[0]["prior_amount_mean"], 112.5, places=4)
        # Second transaction should have count = 3
        self.assertEqual(features.iloc[1]["prior_card_count"], 3)

    def test_cross_batch_chronological_violation_rejection(self):
        """Passing historical records with TransactionDT succeeding batch start must raise ValueError."""
        # Prior history at t=3000 (future relative to batch at t=1000)
        future_history = create_synthetic_raw_dataframe(n_rows=2, base_dt=3000)
        batch = create_synthetic_raw_dataframe(n_rows=2, base_dt=1000)

        with self.assertRaises(ValueError) as ctx:
            self.scorer.extract_features(batch, prior_history_df=future_history)
        self.assertIn("Chronological separation violation", str(ctx.exception))

    def test_cross_batch_overlapping_history_rejection(self):
        """Passing historical records overlapping with the batch must raise ValueError."""
        # Prior history at t=1000 with identical or higher TransactionID
        overlapping_history = create_synthetic_raw_dataframe(n_rows=2, base_dt=1000)
        batch = create_synthetic_raw_dataframe(n_rows=2, base_dt=1000)

        with self.assertRaises(ValueError) as ctx:
            self.scorer.extract_features(batch, prior_history_df=overlapping_history)
        self.assertIn("Chronological separation violation", str(ctx.exception))


class TestRiskScoreMappingAndTiers(unittest.TestCase):
    """Test Suite 4: Risk Score Conversion and Severity Mapping."""

    def setUp(self):
        self.scorer = BehaviouralBatchScorer()

    def test_risk_score_bounds_and_severity_thresholds(self):
        """Risk scores must lie in [0.0, 100.0] and map to correct severity tiers."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        result = self.scorer.score_batch(df, compute_shap=False, save_to_db=False)

        scores = result.risk_scores
        for score in scores:
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 100.0)

        for record in result.risk_score_documents:
            s = record["risk_score"]
            level = record["risk_level"]
            if s >= 75.0:
                self.assertEqual(level, "HIGH")
            elif s >= 40.0:
                self.assertEqual(level, "MEDIUM")
            else:
                self.assertEqual(level, "LOW")


class TestExplanationAdapter(unittest.TestCase):
    """Test Suite 5: SHAP Explanation Schema Compatibility."""

    def test_explanation_document_schema(self):
        """Explanation document must match Spring Boot Explanation entity schema."""
        feature_names = ["amount_deviation", "prior_card_count", "TransactionAmt", "V1", "time_sin", "C1"]
        row_vals = np.array([0.5, 4.0, 250.0, 1.0, 0.707, 3.0])
        row_shaps = np.array([0.45, -0.25, 0.30, 0.15, -0.10, 0.05])

        doc = adapt_single_explanation(
            tx_id=3000001,
            batch_id="BATCH-TEST-01",
            customer_id="cust_test_123",
            row_values=row_vals,
            row_shaps=row_shaps,
            feature_names=feature_names,
            base_value=-2.5
        )

        self.assertEqual(doc["transaction_id"], 3000001)
        self.assertEqual(doc["batch_id"], "BATCH-TEST-01")
        self.assertEqual(doc["customer_id"], "cust_test_123")
        self.assertEqual(doc["base_value"], -2.5)
        self.assertIn("top_factors", doc)
        self.assertIn("positive_drivers", doc)
        self.assertIn("negative_drivers", doc)
        self.assertIn("primary_risk_driver", doc)

        # Check positive drivers only have shap_value > 0
        for item in doc["positive_drivers"]:
            self.assertGreater(item["shap_value"], 0)
            self.assertEqual(item["impact"], "INCREASES_RISK")

        # Check negative drivers only have shap_value < 0
        for item in doc["negative_drivers"]:
            self.assertLess(item["shap_value"], 0)
            self.assertEqual(item["impact"], "DECREASES_RISK")

        # Check TopFactor structure
        top_factor = doc["top_factors"][0]
        self.assertIn("feature", top_factor)
        self.assertIn("value", top_factor)
        self.assertIn("shap_value", top_factor)
        self.assertIn("impact", top_factor)
        self.assertIn("description", top_factor)

    def test_human_readable_descriptions_integrity(self):
        """Feature descriptions must accurately reflect features without fabrication."""
        desc_dev = format_feature_description("amount_deviation", 0.45, 0.52)
        self.assertIn("+45.0%", desc_dev)
        self.assertIn("increases fraud risk", desc_dev)

        desc_count = format_feature_description("prior_card_count", 0, -0.12)
        self.assertIn("First observed transaction", desc_count)

        desc_amt = format_feature_description("TransactionAmt", 500.0, 0.31)
        self.assertIn("$500.00", desc_amt)

    def test_global_importance_descriptions_populated(self):
        """Global feature importance must include human-readable descriptions for dashboard UI."""
        mean_shaps = np.array([0.5, 0.3, 0.2])
        names = ["amount_deviation", "prior_card_count", "TransactionAmt"]
        global_imp = adapt_global_importance(mean_shaps, names)
        self.assertEqual(len(global_imp), 3)
        for item in global_imp:
            self.assertIn("feature", item)
            self.assertIn("importance", item)
            self.assertIn("description", item)
            self.assertNotEqual(item["feature"], item["description"])


class TestFullBatchScoringLifecycle(unittest.TestCase):
    """Test Suite 6: Full In-Memory Batch Scoring Lifecycle."""

    def setUp(self):
        self.scorer = BehaviouralBatchScorer()

    def test_full_batch_scoring_document_schemas(self):
        """Verify that score_batch generates complete, valid documents for all 5 entities."""
        df = create_synthetic_raw_dataframe(n_rows=4)
        result = self.scorer.score_batch(
            df,
            batch_id="BATCH-TEST-2026",
            compute_shap=True,
            save_to_db=False
        )

        self.assertIsInstance(result, BatchExecutionResult)
        self.assertEqual(result.transaction_count, 4)
        self.assertEqual(result.model_version, "XGBoost-v3.0-behavioural-397")

        # 1. Batch document
        b_doc = result.batch_document
        self.assertEqual(b_doc["batch_id"], "BATCH-TEST-2026")
        self.assertEqual(b_doc["transaction_count"], 4)
        self.assertIn("global_feature_importance", b_doc)

        # 2. Transaction documents
        self.assertEqual(len(result.transaction_documents), 4)
        tx0 = result.transaction_documents[0]
        self.assertEqual(tx0["transaction_id"], 3000000)
        self.assertEqual(tx0["batch_id"], "BATCH-TEST-2026")
        self.assertIn("customer_id", tx0)
        self.assertIn("timestamp", tx0)

        # 3. Risk score documents
        self.assertEqual(len(result.risk_score_documents), 4)
        rs0 = result.risk_score_documents[0]
        self.assertEqual(rs0["transaction_id"], 3000000)
        self.assertIn("risk_score", rs0)
        self.assertIn("raw_probability", rs0)
        self.assertIn("calibrated_probability", rs0)
        self.assertEqual(rs0["raw_probability"], rs0["calibrated_probability"])

        # 4. Explanations documents
        self.assertEqual(len(result.explanation_documents), 4)
        exp0 = result.explanation_documents[0]
        self.assertEqual(exp0["transaction_id"], 3000000)
        self.assertIn("top_factors", exp0)
        self.assertIn("positive_drivers", exp0)
        self.assertIn("negative_drivers", exp0)

    def test_production_database_write_safety_prohibition(self):
        """Attempting to write to 'finguard' or any casing/whitespace variant must trigger PermissionError."""
        df = create_synthetic_raw_dataframe(n_rows=2)
        # Test exact 'finguard', mixed-case 'FinGuard', and padded 'finguard '
        forbidden_variants = ["finguard", "FinGuard", "finguard ", " FinGuard  ", "FINGUARD"]
        for db_name in forbidden_variants:
            with self.subTest(target_db_name=db_name):
                with self.assertRaises(PermissionError) as ctx:
                    self.scorer.score_batch(
                        df,
                        save_to_db=True,
                        target_db_name=db_name
                    )
                self.assertIn("Writes to production MongoDB database", str(ctx.exception))

    def test_explicit_calibration_metadata_in_outputs(self):
        """Outputs must explicitly declare calibration_method: 'NONE_RAW_MIRROR' and is_calibrated: False."""
        df = create_synthetic_raw_dataframe(n_rows=3)
        result = self.scorer.score_batch(df, compute_shap=False, save_to_db=False)

        # BatchExecutionResult level
        self.assertEqual(result.calibration_method, "NONE_RAW_MIRROR")
        self.assertFalse(result.is_calibrated)

        # Batch document level
        b_doc = result.batch_document
        self.assertEqual(b_doc["calibration_method"], "NONE_RAW_MIRROR")
        self.assertFalse(b_doc["is_calibrated"])
        self.assertIn("calibration_note", b_doc)

        # Risk score documents level
        for doc in result.risk_score_documents:
            self.assertEqual(doc["calibration_method"], "NONE_RAW_MIRROR")
            self.assertFalse(doc["is_calibrated"])
            self.assertIn("calibration_note", doc)
            self.assertEqual(doc["raw_probability"], doc["calibrated_probability"])


if __name__ == "__main__":
    unittest.main()
