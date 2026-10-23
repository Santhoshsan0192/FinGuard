"""
FinGuard Isolated Behavioural Model Integration - Input Schema Validator
Validates that incoming raw transaction DataFrames contain all 392 required base IEEE-CIS
columns prior to behavioural feature engineering.
"""

import os
import json
import pandas as pd

SANDBOX_DIR = os.path.dirname(__file__)
FEATURE_COLUMNS_FILE = os.path.join(SANDBOX_DIR, "feature_columns.json")


class SchemaValidationError(ValueError):
    """
    Raised when an input DataFrame fails schema validation requirements.
    Contains detailed diagnostics about missing and required columns.
    """

    def __init__(self, message, missing_columns=None, total_required=0, total_provided=0):
        super().__init__(message)
        self.missing_columns = missing_columns or []
        self.missing_count = len(self.missing_columns)
        self.total_required = total_required
        self.total_provided = total_provided

    def to_dict(self):
        return {
            "error": "SchemaValidationError",
            "message": str(self),
            "missing_count": self.missing_count,
            "total_required": self.total_required,
            "total_provided": self.total_provided,
            "missing_sample": self.missing_columns[:15]
        }


def get_required_raw_columns():
    """
    Returns the complete list of 392 raw IEEE-CIS base columns expected
    in the raw transaction dataset prior to behavioural feature extraction.
    """
    with open(FEATURE_COLUMNS_FILE, "r") as f:
        data = json.load(f)
    return list(data["baseline"])


def validate_raw_transaction_input(df, require_transaction_id=True):
    """
    Validates that the input DataFrame is well-formed and contains all necessary
    raw columns for the 397-feature Kaggle behavioural model pipeline.

    Parameters:
        df (pd.DataFrame): Raw transaction DataFrame to validate.
        require_transaction_id (bool): Whether TransactionID must be present.

    Returns:
        tuple (bool, list): (True, []) if valid.

    Raises:
        SchemaValidationError: If df is not a DataFrame, is empty, or is missing required columns.
    """
    if not isinstance(df, pd.DataFrame):
        raise SchemaValidationError(
            f"Expected input to be a pandas DataFrame, but received {type(df).__name__}."
        )

    if df.empty:
        raise SchemaValidationError("Input transaction DataFrame is empty (0 records).")

    required_raw = get_required_raw_columns()
    if require_transaction_id and "TransactionID" not in required_raw:
        required_cols = ["TransactionID"] + required_raw
    else:
        required_cols = required_raw

    missing = [col for col in required_cols if col not in df.columns]

    if missing:
        missing_sample = missing[:10]
        sample_str = ", ".join(missing_sample)
        if len(missing) > 10:
            sample_str += f", ... (+{len(missing) - 10} more)"
        raise SchemaValidationError(
            f"Input DataFrame is missing {len(missing)} required raw columns out of {len(required_cols)}. "
            f"Missing columns include: [{sample_str}]. "
            "Ensure the full IEEE-CIS dataset schema is provided rather than a reduced subset.",
            missing_columns=missing,
            total_required=len(required_cols),
            total_provided=len(df.columns)
        )

    # Validate essential numerical columns
    for col in ["TransactionDT", "TransactionAmt"]:
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise SchemaValidationError(
                f"Column '{col}' must be numeric, but received dtype '{df[col].dtype}'."
            )

    return True, []
