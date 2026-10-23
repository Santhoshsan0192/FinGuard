"""
FinGuard Phase 3 - Isolated Kaggle Behavioural Feature Engineering Pipeline
Sandbox module implementing the exact recovered 8-step preprocessing pipeline:
1. Chronological sorting
2. Card key construction from card1-card6
3. Causal prior transaction count & prior amount mean
4. Signed relative amount deviation
5. Cyclical diurnal time features (time_sin, time_cos)
6. Deterministic categorical code encoding
7. Infinite value replacement with missing values (np.nan)
8. Exact 397-feature column ordering
"""

import os
import json
import numpy as np
import pandas as pd

SANDBOX_DIR = os.path.dirname(__file__)
FEATURE_COLUMNS_FILE = os.path.join(SANDBOX_DIR, "feature_columns.json")

CATEGORICAL_COLS = [
    "ProductCD", "card4", "card6", "P_emaildomain", "R_emaildomain",
    "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"
]

CARD_KEY_COLS = ["card1", "card2", "card3", "card4", "card5", "card6"]


def load_feature_columns():
    """Loads the canonical 397 behavioural feature catalog."""
    with open(FEATURE_COLUMNS_FILE, "r") as f:
        data = json.load(f)
    return data["behavioural"]


def construct_card_key(df):
    """
    Constructs the exact string composite card key used in the Kaggle experiment:
    card1_card2_card3_card4_card5_card6

    In pandas 1.x (original Kaggle environment), casting float/object columns containing
    NaN to str converted missing values to the literal string 'nan'. In pandas 3.0+,
    .astype(str) preserves nullable NA, causing string concatenation to propagate NA
    and groupby to drop transactions with missing card attributes. Explicitly calling
    .fillna('nan').astype(str) preserves exact Kaggle behavioral card key parity.
    """
    return (
        df["card1"].fillna("nan").astype(str) + "_" +
        df["card2"].fillna("nan").astype(str) + "_" +
        df["card3"].fillna("nan").astype(str) + "_" +
        df["card4"].fillna("nan").astype(str) + "_" +
        df["card5"].fillna("nan").astype(str) + "_" +
        df["card6"].fillna("nan").astype(str)
    )


def extract_kaggle_behavioural_features(df):
    """
    Transforms raw IEEE-CIS transaction DataFrame into the exact 397-feature matrix
    required by behavioural_xgboost.json with machine-precision parity.
    """
    df = df.copy()

    # 1. Chronological sort
    if "TransactionDT" in df.columns:
        sort_cols = ["TransactionDT"]
        if "TransactionID" in df.columns:
            sort_cols.append("TransactionID")
        df = df.sort_values(by=sort_cols).reset_index(drop=True)

    # 2. Card Key construction
    card_key = construct_card_key(df)
    df["card_key"] = card_key

    # 3. Causal historical count & mean (strictly prior to current transaction)
    # cumcount() starts at 0, representing transactions prior to the current one
    prior_count = df.groupby("card_key").cumcount()
    df["prior_card_count"] = prior_count

    # cumsum() - current amount gives prior cumulative amount
    cum_amt = df.groupby("card_key")["TransactionAmt"].cumsum() - df["TransactionAmt"]
    df["prior_amount_mean"] = cum_amt / prior_count.replace(0, np.nan)

    # 4. Signed relative amount deviation (dividing by absolute prior mean)
    df["amount_deviation"] = (df["TransactionAmt"] - df["prior_amount_mean"]) / np.abs(df["prior_amount_mean"])

    # 5. Cyclical diurnal time features from TransactionDT
    time_norm = (df["TransactionDT"] % 86400) / 86400.0
    df["time_sin"] = np.sin(2.0 * np.pi * time_norm)
    df["time_cos"] = np.cos(2.0 * np.pi * time_norm)

    # 6. Categorical encoding via category codes
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            df[col] = df[col].astype("category").cat.codes

    # 7. Replace infinite values with np.nan (handled natively by XGBoost tree routing)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)

    # 8. Reorder strictly according to the 397 feature catalog
    expected_features = load_feature_columns()
    missing_cols = [c for c in expected_features if c not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Input DataFrame is missing {len(missing_cols)} required IEEE-CIS columns. "
            f"Missing sample: {missing_cols[:10]}"
        )

    return df[expected_features].copy()
