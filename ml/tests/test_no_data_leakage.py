"""
FinGuard - Data Leakage Automated Verification Test
Tests that future transactions NEVER influence features for earlier transactions.
Verifies temporal integrity, cold-start handling, and feature causality.
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

# Add ml directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data_loader import load_raw_dataset
from features import engineer_features_leakage_safe


class TestNoDataLeakage(unittest.TestCase):

    def setUp(self):
        # Create a controlled synthetic customer timeline with 5 sequential transactions
        self.test_df = pd.DataFrame([
            {
                "TransactionID": 1001,
                "customer_id": "CUST_TEST",
                "TransactionDT": 1000,
                "TransactionAmt": 50.0,
                "ProductCD": "W",
                "card1": 1234,
                "card4": "visa",
                "card6": "debit",
                "DeviceType": "desktop",
                "DeviceInfo": "Windows",
                "dist1": 10.0,
                "C1": 1, "C2": 1, "C4": 0, "D1": 5.0, "D2": 2.0,
                "isFraud": 0
            },
            {
                "TransactionID": 1002,
                "customer_id": "CUST_TEST",
                "TransactionDT": 5000,
                "TransactionAmt": 70.0,
                "ProductCD": "W",
                "card1": 1234,
                "card4": "visa",
                "card6": "debit",
                "DeviceType": "desktop",
                "DeviceInfo": "Windows",
                "dist1": 12.0,
                "C1": 2, "C2": 1, "C4": 0, "D1": 5.0, "D2": 2.0,
                "isFraud": 0
            },
            {
                "TransactionID": 1003,
                "customer_id": "CUST_TEST",
                "TransactionDT": 10000,
                "TransactionAmt": 60.0,
                "ProductCD": "W",
                "card1": 1234,
                "card4": "visa",
                "card6": "debit",
                "DeviceType": "desktop",
                "DeviceInfo": "Windows",
                "dist1": 11.0,
                "C1": 3, "C2": 2, "C4": 0, "D1": 5.0, "D2": 2.0,
                "isFraud": 0
            },
            {
                "TransactionID": 1004,
                "customer_id": "CUST_TEST",
                "TransactionDT": 20000,
                "TransactionAmt": 500.0,  # Huge outlier in the future
                "ProductCD": "W",
                "card1": 1234,
                "card4": "visa",
                "card6": "debit",
                "DeviceType": "mobile",
                "DeviceInfo": "iOS",
                "dist1": 350.0,
                "C1": 10, "C2": 8, "C4": 2, "D1": 5.0, "D2": 2.0,
                "isFraud": 1
            }
        ])

    def test_first_transaction_is_cold_start(self):
        """Transaction 1 must have cold_start_customer_flag == 1 and no prior history."""
        feat_df, _, _ = engineer_features_leakage_safe(self.test_df.copy())
        row1 = feat_df[feat_df["TransactionID"] == 1001].iloc[0]
        self.assertEqual(row1["cold_start_customer_flag"], 1)
        self.assertEqual(row1["customer_transaction_count"], 0)

    def test_future_outlier_does_not_alter_past_baseline(self):
        """
        Adding an extreme future transaction (TransactionID 1004: $500 spend)
        must NEVER change the baseline_avg_amt or amt_zscore of TransactionID 1002.
        """
        # Feature set with only first 3 transactions (before future outlier)
        df_early = self.test_df.iloc[:3].copy()
        feat_early, _, _ = engineer_features_leakage_safe(df_early)
        row2_early = feat_early[feat_early["TransactionID"] == 1002].iloc[0]

        # Feature set with all 4 transactions (including future $500 outlier)
        feat_all, _, _ = engineer_features_leakage_safe(self.test_df.copy())
        row2_all = feat_all[feat_all["TransactionID"] == 1002].iloc[0]

        # Verify that row 1002 has identical features in both cases
        self.assertAlmostEqual(row2_early["baseline_avg_amt"], row2_all["baseline_avg_amt"], places=4)
        self.assertAlmostEqual(row2_early["amt_to_baseline_ratio"], row2_all["amt_to_baseline_ratio"], places=4)
        self.assertAlmostEqual(row2_early["amt_zscore"], row2_all["amt_zscore"], places=4)
        self.assertAlmostEqual(row2_early["velocity_hours_since_last_tx"], row2_all["velocity_hours_since_last_tx"], places=4)

    def test_causal_rolling_spend(self):
        """Rolling 24h spend must only sum transactions up to current timestamp, never forward."""
        feat_df, _, _ = engineer_features_leakage_safe(self.test_df.copy())
        row1 = feat_df[feat_df["TransactionID"] == 1001].iloc[0]
        row2 = feat_df[feat_df["TransactionID"] == 1002].iloc[0]
        
        # Row 1 spend in 24h should only include row 1 ($50)
        self.assertEqual(row1["amt_sum_24h"], 50.0)
        # Row 2 (DT=5000, 4000s after row 1) includes row 1 + row 2 ($50 + $70 = $120)
        self.assertEqual(row2["amt_sum_24h"], 120.0)

    def test_target_label_not_in_features(self):
        """The target column 'isFraud' must never be in feature_cols."""
        feat_df, _, feature_cols = engineer_features_leakage_safe(self.test_df.copy())
        self.assertNotIn("isFraud", feature_cols)
        self.assertNotIn("is_fraud_ground_truth", feature_cols)


if __name__ == "__main__":
    unittest.main()
