"""
FinGuard - Feature Engineering Module (Leakage-Safe)
Builds customer behaviour baselines causally without future data leakage.
Computes frequency, velocity, timing, deviations, rolling windows, and cold-start flags.
"""

import numpy as np
import pandas as pd

# Core 23 features preserved for 100% backward compatibility
CORE_23_FEATURES = [
    "TransactionAmt",
    "amt_to_baseline_ratio",
    "amt_zscore",
    "velocity_hours_since_last_tx",
    "velocity_rapid_tx_flag",
    "is_off_hours",
    "tx_freq_24h",
    "amt_sum_24h",
    "spend_24h_to_baseline_ratio",
    "device_anomaly_flag",
    "hour_of_day",
    "day_of_week",
    "baseline_avg_amt",
    "C1", "C2", "C4",
    "D1", "D2",
    "dist1",
    "ProductCD_enc",
    "card4_enc",
    "card6_enc",
    "DeviceType_enc"
]

# Extended features including Phase 8 & 9 enhancements
EXTENDED_FEATURES = CORE_23_FEATURES + [
    "transactions_1h",
    "transactions_6h",
    "transactions_24h",
    "amount_1h",
    "amount_6h",
    "amount_24h",
    "time_since_last_transaction",
    "device_change_count",
    "new_device_flag",
    "new_card_flag",
    "location_change_flag",
    "night_transaction_flag",
    "weekend_transaction_flag",
    "customer_transaction_count",
    "cold_start_customer_flag"
]

# Deterministic encoding maps for leak-free, reproducible categorical conversion
PRODUCT_CD_MAP = {"W": 0, "H": 1, "C": 2, "R": 3, "S": 4}
CARD4_MAP = {"visa": 0, "mastercard": 1, "discover": 2, "american express": 3}
CARD6_MAP = {"debit": 0, "credit": 1}
DEVICE_TYPE_MAP = {"desktop": 0, "mobile": 1}


def _encode_categoricals(df):
    """Deterministically encode categorical columns without fitting across test data."""
    df = df.copy()
    df["ProductCD_enc"] = df["ProductCD"].astype(str).str.strip().map(lambda x: PRODUCT_CD_MAP.get(x, -1)).astype(int)
    df["card4_enc"] = df["card4"].astype(str).str.strip().str.lower().map(lambda x: CARD4_MAP.get(x, -1)).astype(int)
    df["card6_enc"] = df["card6"].astype(str).str.strip().str.lower().map(lambda x: CARD6_MAP.get(x, -1)).astype(int)
    df["DeviceType_enc"] = df["DeviceType"].astype(str).str.strip().str.lower().map(lambda x: DEVICE_TYPE_MAP.get(x, -1)).astype(int)
    return df


def engineer_features_leakage_safe(df, prior_history_df=None, pop_stats=None, feature_set="core"):
    """
    Leakage-safe feature engineering:
    For every transaction t_i, baseline and behavioural features use ONLY
    transactions strictly prior to t_i (either from prior_history_df or earlier in df).

    Parameters:
    - df: DataFrame of transactions to score/engineer
    - prior_history_df: Optional DataFrame of historical transactions (e.g. training set when processing test set)
    - pop_stats: Optional dict of population-level fallback statistics
    - feature_set: 'core' (23 features) or 'extended' (38 features)

    Returns:
    - df_engineered: DataFrame with engineered features
    - customer_profiles: dict of customer profiles for MongoDB storage
    - feature_cols: list of feature column names used for ML
    """
    df = df.copy()

    # Compute population baselines if not provided
    if pop_stats is None:
        ref_df = prior_history_df if prior_history_df is not None and not prior_history_df.empty else df
        pop_stats = {
            "mean_amt": float(ref_df["TransactionAmt"].mean()) if "TransactionAmt" in ref_df.columns else 135.0,
            "std_amt": float(ref_df["TransactionAmt"].std()) if "TransactionAmt" in ref_df.columns and len(ref_df) > 1 else 100.0,
            "median_amt": float(ref_df["TransactionAmt"].median()) if "TransactionAmt" in ref_df.columns else 68.0,
            "min_hour": 8,
            "max_hour": 22,
            "primary_device": "desktop",
            "primary_card": "visa"
        }
        if np.isnan(pop_stats["std_amt"]) or pop_stats["std_amt"] == 0:
            pop_stats["std_amt"] = pop_stats["mean_amt"] * 0.5

    # Compute hour of day and day of week
    df["hour_of_day"] = ((df["TransactionDT"] // 3600) % 24).astype(int)
    df["day_of_week"] = ((df["TransactionDT"] // 86400) % 7).astype(int)

    # Encode categoricals deterministically
    df = _encode_categoricals(df)

    # Prepare prior history if present
    if prior_history_df is not None and not prior_history_df.empty:
        prior_clean = prior_history_df.copy()
        if "hour_of_day" not in prior_clean.columns:
            prior_clean["hour_of_day"] = ((prior_clean["TransactionDT"] // 3600) % 24).astype(int)
        if "day_of_week" not in prior_clean.columns:
            prior_clean["day_of_week"] = ((prior_clean["TransactionDT"] // 86400) % 7).astype(int)
        prior_clean = _encode_categoricals(prior_clean)
        prior_clean["_is_prior_history"] = True
    else:
        prior_clean = pd.DataFrame()

    df["_is_prior_history"] = False
    original_indices = df.index.copy()

    # Combine prior history with current df for causal sequential processing per customer
    if not prior_clean.empty:
        combined = pd.concat([prior_clean, df], ignore_index=True)
    else:
        combined = df.copy()

    # Sort strictly chronologically
    combined = combined.sort_values(by=["customer_id", "TransactionDT", "TransactionID"]).reset_index(drop=True)

    # Feature output containers
    rows_output = []
    latest_customer_profiles = {}

    for cid, cust_group in combined.groupby("customer_id", sort=False):
        history = []  # list of dicts for transactions strictly prior to current

        for _, row in cust_group.iterrows():
            is_prior = row.get("_is_prior_history", False)
            curr_amt = float(row["TransactionAmt"])
            curr_dt = int(row["TransactionDT"])
            curr_hour = int(row["hour_of_day"])
            curr_dow = int(row["day_of_week"])
            curr_dev = str(row.get("DeviceType", "unknown"))
            curr_card = str(row.get("card4", "unknown"))
            curr_dist = float(row.get("dist1", 0.0)) if pd.notnull(row.get("dist1")) else 0.0

            # 1. Baselining strictly from history
            if len(history) == 0:
                # Cold start: Customer has 0 prior transactions
                cold_start = 1
                cust_tx_count = 0
                base_avg = pop_stats["mean_amt"]
                base_std = pop_stats["std_amt"]
                base_med = pop_stats["median_amt"]
                min_hour = pop_stats["min_hour"]
                max_hour = pop_stats["max_hour"]
                primary_dev = "unknown"
                primary_card = "unknown"
                dev_anomaly = 0
                new_dev = 1
                new_card = 1
                dev_change_cnt = 0
                vel_hours = 999.0
                vel_rapid = 0
                loc_change = 0
            else:
                cold_start = 0
                cust_tx_count = len(history)
                hist_amts = [h["amt"] for h in history]
                base_avg = float(np.mean(hist_amts))
                base_std = float(np.std(hist_amts)) if len(hist_amts) > 1 else base_avg * 0.2
                if base_std == 0:
                    base_std = 1.0
                base_med = float(np.median(hist_amts))

                hist_hours = [h["hour"] for h in history]
                min_hour = int(np.percentile(hist_hours, 10))
                max_hour = int(np.percentile(hist_hours, 90))

                valid_devs = [h["device"] for h in history if h["device"] not in ("unknown", "nan")]
                primary_dev = max(set(valid_devs), key=valid_devs.count) if valid_devs else "unknown"

                valid_cards = [h["card"] for h in history if h["card"] not in ("unknown", "nan")]
                primary_card = max(set(valid_cards), key=valid_cards.count) if valid_cards else "unknown"

                dev_anomaly = 1 if (primary_dev != "unknown" and curr_dev != primary_dev) else 0
                devices_seen = set(valid_devs)
                new_dev = 1 if (curr_dev not in ("unknown", "nan") and curr_dev not in devices_seen) else 0

                cards_seen = set(valid_cards)
                new_card = 1 if (curr_card not in ("unknown", "nan") and curr_card not in cards_seen) else 0

                dev_change_cnt = sum(1 for k in range(1, len(history)) if history[k]["device"] != history[k-1]["device"])

                last_dt = history[-1]["dt"]
                vel_hours = round((curr_dt - last_dt) / 3600.0, 2)
                vel_rapid = 1 if vel_hours < 0.25 else 0

                last_dist = history[-1]["dist"]
                loc_change = 1 if abs(curr_dist - last_dist) > 100.0 else 0

            # 2. Deviations from historical baseline
            amt_ratio = round(curr_amt / (base_avg + 1e-5), 4)
            amt_zscore = round((curr_amt - base_avg) / (base_std + 1.0), 4)
            is_off_hours = 1 if (curr_hour < min_hour or curr_hour > max_hour or curr_hour in [1, 2, 3, 4]) else 0

            # 3. Rolling window aggregations (causal lookback up to current transaction)
            # 24 hours = 86,400 seconds
            rolling_24h = [h for h in history if h["dt"] >= curr_dt - 86400]
            tx_freq_24h = len(rolling_24h) + 1  # count including current
            amt_sum_24h = round(sum(h["amt"] for h in rolling_24h) + curr_amt, 2)
            spend_24h_ratio = round(amt_sum_24h / (base_avg + 1e-5), 2)

            # 1 hour = 3,600 seconds
            rolling_1h = [h for h in history if h["dt"] >= curr_dt - 3600]
            tx_freq_1h = len(rolling_1h) + 1
            amt_sum_1h = round(sum(h["amt"] for h in rolling_1h) + curr_amt, 2)

            # 6 hours = 21,600 seconds
            rolling_6h = [h for h in history if h["dt"] >= curr_dt - 21600]
            tx_freq_6h = len(rolling_6h) + 1
            amt_sum_6h = round(sum(h["amt"] for h in rolling_6h) + curr_amt, 2)

            # Timing & temporal flags
            night_flag = 1 if curr_hour in [0, 1, 2, 3, 4, 5] else 0
            weekend_flag = 1 if curr_dow in [5, 6] else 0
            time_since_last_tx = round(vel_hours * 3600.0, 2)

            # Record engineered fields if this row is part of the output dataframe
            if not is_prior:
                res_dict = row.to_dict()
                res_dict["baseline_avg_amt"] = round(base_avg, 2)
                res_dict["baseline_std_amt"] = round(base_std, 2)
                res_dict["baseline_median_amt"] = round(base_med, 2)
                res_dict["amt_to_baseline_ratio"] = amt_ratio
                res_dict["amt_zscore"] = amt_zscore
                res_dict["velocity_hours_since_last_tx"] = vel_hours
                res_dict["velocity_rapid_tx_flag"] = vel_rapid
                res_dict["is_off_hours"] = is_off_hours
                res_dict["tx_freq_24h"] = tx_freq_24h
                res_dict["amt_sum_24h"] = amt_sum_24h
                res_dict["spend_24h_to_baseline_ratio"] = spend_24h_ratio
                res_dict["device_anomaly_flag"] = dev_anomaly
                res_dict["transactions_1h"] = tx_freq_1h
                res_dict["transactions_6h"] = tx_freq_6h
                res_dict["transactions_24h"] = tx_freq_24h
                res_dict["amount_1h"] = amt_sum_1h
                res_dict["amount_6h"] = amt_sum_6h
                res_dict["amount_24h"] = amt_sum_24h
                res_dict["time_since_last_transaction"] = time_since_last_tx
                res_dict["device_change_count"] = dev_change_cnt
                res_dict["new_device_flag"] = new_dev
                res_dict["new_card_flag"] = new_card
                res_dict["location_change_flag"] = loc_change
                res_dict["night_transaction_flag"] = night_flag
                res_dict["weekend_transaction_flag"] = weekend_flag
                res_dict["customer_transaction_count"] = cust_tx_count
                res_dict["cold_start_customer_flag"] = cold_start
                rows_output.append(res_dict)

            # Advance customer state causally: add current transaction to history
            history.append({
                "dt": curr_dt,
                "amt": curr_amt,
                "hour": curr_hour,
                "dow": curr_dow,
                "device": curr_dev,
                "card": curr_card,
                "dist": curr_dist
            })

        # Final customer baseline profile after all transactions
        if len(history) > 0:
            hist_amts = [h["amt"] for h in history]
            hist_hours = [h["hour"] for h in history]
            valid_devs = [h["device"] for h in history if h["device"] not in ("unknown", "nan")]
            valid_cards = [h["card"] for h in history if h["card"] not in ("unknown", "nan")]

            latest_customer_profiles[str(cid)] = {
                "customer_id": str(cid),
                "baseline_avg_amt": float(round(np.mean(hist_amts), 2)),
                "baseline_std_amt": float(round(np.std(hist_amts) if len(hist_amts) > 1 else np.mean(hist_amts) * 0.2, 2)),
                "baseline_median_amt": float(round(np.median(hist_amts), 2)),
                "total_transactions": len(history),
                "typical_active_hours": f"{int(np.percentile(hist_hours, 10))}:00 - {int(np.percentile(hist_hours, 90))}:00",
                "primary_device": max(set(valid_devs), key=valid_devs.count) if valid_devs else "unknown",
                "primary_card": max(set(valid_cards), key=valid_cards.count) if valid_cards else "unknown",
                "cold_start": len(history) < 3
            }

    df_out = pd.DataFrame(rows_output)
    if "_is_prior_history" in df_out.columns:
        df_out = df_out.drop(columns=["_is_prior_history"])

    # Reorder to match original DataFrame order by TransactionID
    if "TransactionID" in df.columns:
        df_out = df_out.set_index("TransactionID").reindex(df["TransactionID"]).reset_index()

    feature_cols = EXTENDED_FEATURES if feature_set == "extended" else CORE_23_FEATURES

    # Ensure all feature columns exist and have valid non-null floats
    for col in feature_cols:
        if col not in df_out.columns:
            df_out[col] = 0.0
        df_out[col] = df_out[col].fillna(0.0)

    customer_profiles_list = list(latest_customer_profiles.values())
    return df_out, customer_profiles_list, feature_cols


def engineer_features(df):
    """
    Backward-compatible wrapper for existing train.py and batch_scorer.py.
    Uses the leak-free implementation with the core 23 features.
    """
    return engineer_features_leakage_safe(df, feature_set="core")


if __name__ == "__main__":
    from data_loader import load_raw_dataset
    df_raw = load_raw_dataset()
    df_feat, profiles, feats = engineer_features_leakage_safe(df_raw)
    print(f"[+] Leakage-safe features engineered: {len(feats)} features, {len(df_feat)} transactions, {len(profiles)} profiles.")
    print("Features:", feats)
    print(df_feat[feats].head(3))
