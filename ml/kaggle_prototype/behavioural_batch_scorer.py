"""
FinGuard Isolated Behavioural Model Integration - Behavioural Batch Scorer
Batch scoring engine for the 397-feature Kaggle behavioural XGBoost model.
Produces Spring Boot and MongoDB compatible documents (batches, transactions,
risk_scores, alerts, explanations) under complete non-destructive isolation.

Strict safety:
- Never executes against or writes to production MongoDB 'finguard'.
- Never invokes the 23-feature calibrator finguard_calibrator.joblib.
- Does not modify production model artifacts or active batch sequences.
"""

import os
import sys
import json
import time
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
import shap

SANDBOX_DIR = os.path.dirname(__file__)
MODEL_FILE = os.path.join(SANDBOX_DIR, "behavioural_xgboost.json")
FEATURE_COLUMNS_FILE = os.path.join(SANDBOX_DIR, "feature_columns.json")

from input_validator import validate_raw_transaction_input, SchemaValidationError
from explanation_adapter import (
    adapt_single_explanation,
    adapt_global_importance,
    determine_primary_risk_driver
)
from kaggle_feature_pipeline import (
    construct_card_key,
    load_feature_columns,
    CATEGORICAL_COLS
)

BASE_DATE = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)


class CalibratorIncompatibilityError(TypeError):
    """Raised when an attempt is made to pass 397 features to the 23-feature calibrator."""
    pass


@dataclass
class BatchExecutionResult:
    """Holds the complete in-memory output of an isolated batch scoring run."""
    batch_id: str
    model_version: str
    transaction_count: int
    fraud_count: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    processing_time_seconds: float
    throughput_tx_sec: float
    batch_document: Dict[str, Any]
    transaction_documents: List[Dict[str, Any]]
    risk_score_documents: List[Dict[str, Any]]
    alert_documents: List[Dict[str, Any]]
    explanation_documents: List[Dict[str, Any]]
    global_feature_importance: List[Dict[str, Any]]
    raw_probabilities: np.ndarray
    risk_scores: np.ndarray
    calibration_method: str = "NONE_RAW_MIRROR"
    is_calibrated: bool = False


class BehaviouralBatchScorer:
    """
    Isolated batch scoring engine for the 397-feature Kaggle behavioural model.
    """

    MODEL_VERSION = "XGBoost-v3.0-behavioural-397"
    DATASET_VERSION = "IEEE-CIS-Full"

    def __init__(
        self,
        model_file: str = MODEL_FILE,
        feature_columns_file: str = FEATURE_COLUMNS_FILE,
        low_threshold: float = 40.0,
        high_threshold: float = 75.0
    ):
        self.model_file = model_file
        self.feature_columns_file = feature_columns_file
        self.low_threshold = float(low_threshold)
        self.high_threshold = float(high_threshold)

        if not os.path.exists(self.model_file):
            raise FileNotFoundError(f"Model file not found at: {self.model_file}")
        if not os.path.exists(self.feature_columns_file):
            raise FileNotFoundError(f"Feature catalog not found at: {self.feature_columns_file}")

        self.feature_columns = load_feature_columns()
        if len(self.feature_columns) != 397:
            raise ValueError(f"Expected 397 feature columns, found {len(self.feature_columns)}")

        # Load native XGBoost booster
        self.booster = xgb.Booster()
        self.booster.load_model(self.model_file)

        # Lazy SHAP explainer
        self._explainer = None

    def _get_explainer(self) -> shap.TreeExplainer:
        if self._explainer is None:
            self._explainer = shap.TreeExplainer(self.booster)
        return self._explainer

    def validate_inputs(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """Validates that the input contains all 392 required base raw columns."""
        return validate_raw_transaction_input(df, require_transaction_id=True)

    def extract_features(
        self,
        df_raw: pd.DataFrame,
        prior_history_df: Optional[pd.DataFrame] = None
    ) -> pd.DataFrame:
        """
        Extracts all 397 features strictly in temporal order without future-data leakage.

        Parameters:
            df_raw (pd.DataFrame): Raw transaction DataFrame for the current batch.
            prior_history_df (Optional[pd.DataFrame]): Historical records from prior batches
                used to calculate pre-existing customer/card velocity baselines.

        Returns:
            pd.DataFrame: 397-column feature matrix strictly ordered to match feature_columns.json.
        """
        # Validate input schema
        self.validate_inputs(df_raw)

        df = df_raw.copy()

        # Sort current batch chronologically by TransactionDT and TransactionID
        df = df.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

        # If historical baseline data is provided, combine causally
        if prior_history_df is not None and not prior_history_df.empty:
            prior_df = prior_history_df.copy()
            prior_df = prior_df.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)

            # Chronological separation validation:
            # All transactions in prior_history_df must strictly precede the earliest transaction in the batch
            min_batch_dt = df["TransactionDT"].iloc[0]
            max_prior_dt = prior_df["TransactionDT"].iloc[-1]
            min_batch_id = df["TransactionID"].iloc[0] if "TransactionID" in df.columns else None
            max_prior_id = prior_df["TransactionID"].iloc[-1] if "TransactionID" in prior_df.columns else None

            has_violation = False
            if max_prior_dt > min_batch_dt:
                has_violation = True
            elif max_prior_dt == min_batch_dt:
                if min_batch_id is not None and max_prior_id is not None:
                    if max_prior_id >= min_batch_id:
                        has_violation = True
                else:
                    has_violation = True

            if has_violation:
                raise ValueError(
                    f"Chronological separation violation: prior_history_df contains records that overlap with or succeed "
                    f"the batch being scored. Latest prior record: (TransactionDT={max_prior_dt}, TransactionID={max_prior_id}) "
                    f"is not strictly prior to batch start: (TransactionDT={min_batch_dt}, TransactionID={min_batch_id})."
                )

            # Mark partition boundaries
            prior_len = len(prior_df)
            combined = pd.concat([prior_df, df], ignore_index=True)
        else:
            prior_len = 0
            combined = df

        # Step 2: Construct verified card key
        combined["card_key"] = construct_card_key(combined)

        # Step 3: Causal historical count & cumulative amount (strictly prior to current transaction)
        # cumcount() gives count strictly before current row within group
        prior_count = combined.groupby("card_key").cumcount()
        combined["prior_card_count"] = prior_count

        # cumsum() - current amount gives prior cumulative amount
        cum_amt = combined.groupby("card_key")["TransactionAmt"].cumsum() - combined["TransactionAmt"]
        combined["prior_amount_mean"] = cum_amt / prior_count.replace(0, np.nan)

        # Step 4: Signed relative amount deviation
        combined["amount_deviation"] = (
            (combined["TransactionAmt"] - combined["prior_amount_mean"]) /
            np.abs(combined["prior_amount_mean"])
        )

        # Step 5: Cyclical diurnal time features from TransactionDT
        time_norm = (combined["TransactionDT"] % 86400) / 86400.0
        combined["time_sin"] = np.sin(2.0 * np.pi * time_norm)
        combined["time_cos"] = np.cos(2.0 * np.pi * time_norm)

        # Step 6: Categorical encoding via category codes
        for col in CATEGORICAL_COLS:
            if col in combined.columns:
                combined[col] = combined[col].astype("category").cat.codes

        # Step 7: Infinite value replacement
        combined.replace([np.inf, -np.inf], np.nan, inplace=True)

        # Extract only the current batch slice if prior history was prepended
        if prior_len > 0:
            batch_features = combined.iloc[prior_len:].copy().reset_index(drop=True)
        else:
            batch_features = combined

        # Step 8: Assert exact 397 feature ordering
        return batch_features[self.feature_columns].copy()

    def score(
        self,
        df_features: pd.DataFrame,
        calibrator: Any = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Scores 397-feature transactions.

        CRITICAL SAFETY RULE: Never pass 397 features into a 23-feature calibrator.
        """
        if calibrator is not None:
            raise CalibratorIncompatibilityError(
                "CRITICAL ERROR: Cannot pass 397-feature inputs into a calibrator. "
                "The existing production calibrator (finguard_calibrator.joblib) expects 23 features. "
                "The 397-feature behavioural model must be scored using its native raw sigmoid probabilities."
            )

        if len(df_features.columns) != 397:
            raise ValueError(
                f"Feature matrix column count mismatch. Expected 397, got {len(df_features.columns)}."
            )

        dmat = xgb.DMatrix(df_features, feature_names=self.feature_columns)
        raw_probs = self.booster.predict(dmat)
        risk_scores = np.round(raw_probs * 100.0, 1)

        return raw_probs, risk_scores

    def score_batch(
        self,
        df_raw: pd.DataFrame,
        prior_history_df: Optional[pd.DataFrame] = None,
        batch_id: Optional[str] = None,
        compute_shap: bool = True,
        save_to_db: bool = False,
        target_db_name: str = "finguard_shadow"
    ) -> BatchExecutionResult:
        """
        Executes a complete isolated batch scoring run without touching production MongoDB.

        Parameters:
            df_raw (pd.DataFrame): Raw transaction DataFrame.
            prior_history_df (Optional[pd.DataFrame]): Historical records for causal continuation.
            batch_id (Optional[str]): Explicit batch ID. Defaults to auto-generated isolated ID.
            compute_shap (bool): Whether to compute TreeSHAP local and global attributions.
            save_to_db (bool): If True, writes only to target_db_name (never 'finguard').
            target_db_name (str): Destination database if save_to_db is True.

        Returns:
            BatchExecutionResult: In-memory container with all formatted documents.
        """
        if save_to_db:
            normalized_db = str(target_db_name).strip().lower() if target_db_name else ""
            if normalized_db == "finguard":
                raise PermissionError(
                    f"SAFETY RESTRICTION: Writes to production MongoDB database '{target_db_name}' are prohibited. "
                    "Use an isolated shadow database (e.g. 'finguard_shadow') or in-memory evaluation."
                )

        start_time = time.time()
        started_at = datetime.now(timezone.utc).isoformat()

        if batch_id is None:
            year = datetime.now(timezone.utc).strftime("%Y")
            batch_id = f"SHADOW-{year}-{int(time.time()) % 10000:04d}"

        # 1. Feature extraction
        df_sorted = df_raw.sort_values(by=["TransactionDT", "TransactionID"]).reset_index(drop=True)
        df_features = self.extract_features(df_sorted, prior_history_df=prior_history_df)

        # 2. Model inference
        raw_probs, risk_scores = self.score(df_features)

        # 3. TreeSHAP computation
        base_value = 0.0
        shap_values = None
        global_importance = []

        if compute_shap:
            explainer = self._get_explainer()
            dmat = xgb.DMatrix(df_features, feature_names=self.feature_columns)
            shap_values = explainer.shap_values(dmat)
            base_value = float(explainer.expected_value) if hasattr(explainer, "expected_value") else 0.0

            mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
            global_importance = adapt_global_importance(mean_abs_shap, self.feature_columns, top_n=20)

        # 4. Assemble compliant documents
        tx_records = []
        score_records = []
        alert_records = []
        expl_records = []

        high_risk_count = 0
        med_risk_count = 0
        low_risk_count = 0
        fraud_label_count = 0

        for i in range(len(df_sorted)):
            row = df_sorted.iloc[i]
            tx_id = int(row["TransactionID"])
            tx_dt_sec = int(row["TransactionDT"])
            tx_timestamp = (BASE_DATE + timedelta(seconds=tx_dt_sec)).isoformat()

            raw_prob = float(raw_probs[i])
            risk_score = float(risk_scores[i])

            if risk_score >= self.high_threshold:
                risk_level = "HIGH"
                high_risk_count += 1
            elif risk_score >= self.low_threshold:
                risk_level = "MEDIUM"
                med_risk_count += 1
            else:
                risk_level = "LOW"
                low_risk_count += 1

            is_fraud = int(row.get("isFraud", 0))
            if is_fraud == 1:
                fraud_label_count += 1

            # Derive canonical customer identifier if not present
            if "customer_id" in row and pd.notna(row["customer_id"]):
                cid = str(row["customer_id"])
            else:
                c1 = str(row.get("card1", "nan"))
                c2 = str(int(row["card2"])) if ("card2" in row and pd.notna(row["card2"])) else "0"
                c4 = str(row.get("card4", "unknown"))
                c6 = str(row.get("card6", "unknown"))
                a1 = str(int(row["addr1"])) if ("addr1" in row and pd.notna(row["addr1"])) else "0"
                cid = f"{c1}_{c2}_{c4}_{c6}_{a1}"

            # Hour of day and day of week
            hour_of_day = int((tx_dt_sec // 3600) % 24)
            day_of_week = int((tx_dt_sec // 86400) % 7)

            # Cold start determination: prior_card_count == 0
            prior_count_val = df_features.iloc[i]["prior_card_count"]
            cold_start_flag = 1 if (np.isnan(prior_count_val) or prior_count_val == 0) else 0

            # Transaction Document
            tx_records.append({
                "_id": f"{batch_id}_{tx_id}",
                "transaction_id": tx_id,
                "batch_id": batch_id,
                "customer_id": cid,
                "amount": float(round(float(row["TransactionAmt"]), 2)),
                "product_cd": str(row.get("ProductCD", "")),
                "card4": str(row.get("card4", "unknown")),
                "card6": str(row.get("card6", "unknown")),
                "device_type": str(row.get("DeviceType", "desktop")),
                "device_info": str(row.get("DeviceInfo", "unknown")),
                "hour_of_day": hour_of_day,
                "day_of_week": day_of_week,
                "TransactionDT": tx_dt_sec,
                "timestamp": tx_timestamp,
                "is_fraud_ground_truth": is_fraud,
                "cold_start_customer_flag": cold_start_flag,
                "created_at": started_at
            })

            # Risk Score Document (calibrated_probability explicitly matches raw_probability)
            score_records.append({
                "_id": f"{batch_id}_{tx_id}",
                "transaction_id": tx_id,
                "batch_id": batch_id,
                "customer_id": cid,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "raw_probability": round(raw_prob, 4),
                "calibrated_probability": round(raw_prob, 4),
                "calibration_method": "NONE_RAW_MIRROR",
                "is_calibrated": False,
                "calibration_note": "Uncalibrated raw sigmoid probability mirrored for Spring Boot DTO compatibility; no calibrator applied.",
                "model_version": self.MODEL_VERSION,
                "scored_at": started_at
            })

            # Explanations & Alerts
            if compute_shap and shap_values is not None:
                row_vals = df_features.iloc[i].values
                row_shaps = shap_values[i]
                expl_doc = adapt_single_explanation(
                    tx_id=tx_id,
                    batch_id=batch_id,
                    customer_id=cid,
                    row_values=row_vals,
                    row_shaps=row_shaps,
                    feature_names=self.feature_columns,
                    base_value=base_value,
                    top_k_factors=6,
                    max_drivers=5,
                    timestamp=started_at
                )
                expl_records.append(expl_doc)
                primary_driver = expl_doc["primary_risk_driver"]
            else:
                primary_driver = "Behavioural Baseline Deviation"

            # Alert Document for medium and high risk
            if risk_score >= self.low_threshold:
                alert_records.append({
                    "_id": f"ALT_{batch_id}_{tx_id}",
                    "alert_id": f"ALT_{batch_id}_{tx_id}",
                    "transaction_id": tx_id,
                    "batch_id": batch_id,
                    "customer_id": cid,
                    "customer_name": f"Customer {cid[:12]}",
                    "amount": float(round(float(row["TransactionAmt"]), 2)),
                    "risk_score": risk_score,
                    "risk_level": risk_level,
                    "primary_risk_driver": primary_driver,
                    "cold_start_flag": cold_start_flag,
                    "status": "NEW",
                    "timestamp": tx_timestamp,
                    "created_at": started_at,
                    "analyst_notes": ""
                })

        elapsed_sec = round(time.time() - start_time, 2)
        completed_at = datetime.now(timezone.utc).isoformat()
        throughput = round(len(df_sorted) / max(elapsed_sec, 0.001), 1)

        # Batch Document
        batch_doc = {
            "batch_id": batch_id,
            "model_version": self.MODEL_VERSION,
            "dataset_version": self.DATASET_VERSION,
            "calibration_method": "NONE_RAW_MIRROR",
            "is_calibrated": False,
            "calibration_note": "397-feature model operates on raw sigmoid probabilities; finguard_calibrator.joblib bypassed.",
            "started_at": started_at,
            "completed_at": completed_at,
            "transaction_count": len(df_sorted),
            "fraud_count": fraud_label_count,
            "high_risk_count": high_risk_count,
            "medium_risk_count": med_risk_count,
            "low_risk_count": low_risk_count,
            "risk_thresholds": {
                "low_threshold": self.low_threshold,
                "high_threshold": self.high_threshold
            },
            "processing_time_seconds": elapsed_sec,
            "status": "COMPLETED",
            "global_feature_importance": global_importance
        }

        # Optional non-production database write
        if save_to_db:
            normalized_db = str(target_db_name).strip().lower() if target_db_name else ""
            if normalized_db == "finguard":
                raise PermissionError(
                    f"SAFETY RESTRICTION: Writes to production MongoDB database '{target_db_name}' are prohibited. "
                    "Use an isolated shadow database (e.g. 'finguard_shadow') or in-memory evaluation."
                )
            import pymongo
            client = pymongo.MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
            db = client[target_db_name]
            if tx_records:
                db["transactions"].insert_many(tx_records)
            if score_records:
                db["risk_scores"].insert_many(score_records)
            if alert_records:
                db["alerts"].insert_many(alert_records)
            if expl_records:
                db["explanations"].insert_many(expl_records)
            db["batches"].insert_one(batch_doc)

        return BatchExecutionResult(
            batch_id=batch_id,
            model_version=self.MODEL_VERSION,
            transaction_count=len(df_sorted),
            fraud_count=fraud_label_count,
            high_risk_count=high_risk_count,
            medium_risk_count=med_risk_count,
            low_risk_count=low_risk_count,
            processing_time_seconds=elapsed_sec,
            throughput_tx_sec=throughput,
            batch_document=batch_doc,
            transaction_documents=tx_records,
            risk_score_documents=score_records,
            alert_documents=alert_records,
            explanation_documents=expl_records,
            global_feature_importance=global_importance,
            raw_probabilities=raw_probs,
            risk_scores=risk_scores,
            calibration_method="NONE_RAW_MIRROR",
            is_calibrated=False
        )
