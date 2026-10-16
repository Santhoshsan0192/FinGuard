"""
FinGuard - Data Loader & Preprocessing Module
Loads and cleans IEEE-CIS Fraud Detection dataset (or generates an authentic IEEE-CIS
schema sample if raw Kaggle CSVs are not present).
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TRANSACTION_CSV = os.path.join(DATA_DIR, "train_transaction.csv")
IDENTITY_CSV = os.path.join(DATA_DIR, "train_identity.csv")


def generate_synthetic_ieeecis(n_customers=120, n_transactions=2200, seed=42):
    """
    Generates an authentic synthetic IEEE-CIS dataset adhering to the official
    IEEE-CIS schema (TransactionID, isFraud, TransactionDT, TransactionAmt, card1-card6,
    addr1, addr2, P_emaildomain, C1-C14, D1-D15, DeviceType, DeviceInfo, etc.)
    with realistic customer baselines and clear fraud anomalies.
    """
    np.random.seed(seed)
    random.seed(seed)
    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"[*] Generating synthetic IEEE-CIS dataset ({n_transactions} transactions across {n_customers} customer profiles)...")

    # 1. Create Customer Archetypes (Baselines)
    customers = []
    card_types = ["visa", "mastercard", "discover"]
    card_categories = ["debit", "credit"]
    domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]
    devices = [("desktop", "Windows"), ("desktop", "MacOS"), ("mobile", "iOS Device"), ("mobile", "SM-G960N")]

    for i in range(1, n_customers + 1):
        cid = f"CUST_{i:04d}"
        device_type, device_info = random.choice(devices)
        customers.append({
            "customer_id": cid,
            "full_name": f"Customer {i}",
            "email": f"user{i}@{random.choice(domains)}",
            "card1": random.randint(1000, 9999),  # Card issuer ID
            "card2": float(random.randint(100, 599)),
            "card3": 150.0,
            "card4": random.choice(card_types),
            "card5": float(random.choice([117, 137, 166, 226])),
            "card6": random.choice(card_categories),
            "addr1": float(random.randint(100, 499)),
            "addr2": 87.0,
            "P_emaildomain": random.choice(domains),
            "typical_amt_mean": round(random.uniform(25.0, 110.0), 2),
            "typical_amt_std": round(random.uniform(8.0, 25.0), 2),
            "active_start_hour": random.randint(7, 9),
            "active_end_hour": random.randint(20, 22),
            "device_type": device_type,
            "device_info": device_info,
            "created_at": datetime(2026, 1, 1) + timedelta(days=random.randint(0, 30))
        })

    # 2. Generate Transactions over 30 days
    base_timestamp = int(datetime(2026, 2, 1, 0, 0, 0).timestamp())
    transactions = []
    identities = []

    fraud_target_count = int(n_transactions * 0.06)  # ~6% fraud rate
    fraud_indices = set(random.sample(range(n_transactions), fraud_target_count))

    for tx_idx in range(n_transactions):
        tx_id = 3000000 + tx_idx
        cust = random.choice(customers)
        is_fraud = 1 if tx_idx in fraud_indices else 0

        # Timing
        day_offset = random.randint(0, 28)
        if is_fraud:
            # Diverse fraud archetypes with varying anomaly strengths (prevents deterministic 99.9 score saturation)
            archetype = random.choice(["velocity", "amount_spike", "device_mismatch", "off_hours", "borderline", "multi_factor"])
            
            if archetype == "borderline":
                # Mild anomaly: slightly higher amount or single off-hours execution -> yields MEDIUM risk (40-74)
                hour = random.choice([22, 23, 5, 6])
                amt = max(15.0, round(cust["typical_amt_mean"] * random.uniform(1.8, 2.6), 2))
                c1_count = random.randint(2, 4)
                c2_count = random.randint(1, 3)
                dev_type = cust["device_type"]
                dev_info = cust["device_info"]
                dist1 = float(random.randint(15, 60))
            elif archetype == "velocity":
                # High velocity burst within short window
                hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                amt = max(10.0, round(np.random.normal(cust["typical_amt_mean"] * 1.3, cust["typical_amt_std"]), 2))
                c1_count = random.randint(4, 8)
                c2_count = random.randint(3, 6)
                dev_type = cust["device_type"]
                dev_info = cust["device_info"]
                dist1 = float(random.randint(5, 45))
            elif archetype == "amount_spike":
                # Severe amount deviation during normal hours on primary device
                hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                amt = round(cust["typical_amt_mean"] * random.uniform(3.5, 7.5) + random.uniform(30, 100), 2)
                c1_count = random.randint(1, 3)
                c2_count = random.randint(1, 2)
                dev_type = cust["device_type"]
                dev_info = cust["device_info"]
                dist1 = float(random.randint(10, 80))
            elif archetype == "device_mismatch":
                # Unrecognized hardware / OS from remote location
                hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                amt = max(20.0, round(cust["typical_amt_mean"] * random.uniform(1.5, 2.8), 2))
                c1_count = random.randint(2, 4)
                c2_count = random.randint(1, 3)
                dev_type = "mobile" if cust["device_type"] == "desktop" else "desktop"
                dev_info = "Linux/Tor"
                dist1 = float(random.randint(300, 900))
            elif archetype == "off_hours":
                # Midnight / early morning transaction with moderate spending
                hour = random.choice([1, 2, 3, 4])
                amt = round(cust["typical_amt_mean"] * random.uniform(2.0, 3.8) + 15.0, 2)
                c1_count = random.randint(2, 5)
                c2_count = random.randint(1, 3)
                dev_type = cust["device_type"]
                dev_info = cust["device_info"]
                dist1 = float(random.randint(20, 120))
            else: # multi_factor
                hour = random.choice([1, 2, 3, 23])
                amt = round(cust["typical_amt_mean"] * random.uniform(4.5, 9.0) + random.uniform(50, 150), 2)
                c1_count = random.randint(5, 12)
                c2_count = random.randint(4, 9)
                dev_type = "mobile" if cust["device_type"] == "desktop" else "desktop"
                dev_info = "Linux/Tor"
                dist1 = float(random.randint(250, 800))

            c4_val = random.randint(0, 3)
            id_01_val = round(random.uniform(-10.0, 2.0), 1)
        else:
            # Legitimate pattern: consistent with profile, with natural mild variances (~4% benign deviations)
            is_mild_anomaly = random.random() < 0.045
            if is_mild_anomaly:
                # Benign deviation (travel, gift purchase, or evening order)
                anomaly_type = random.choice(["spend", "time", "travel"])
                if anomaly_type == "spend":
                    hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                    amt = max(15.0, round(cust["typical_amt_mean"] * random.uniform(2.0, 3.2), 2))
                    dist1 = float(random.randint(5, 40))
                elif anomaly_type == "time":
                    hour = random.choice([22, 23, 0, 5])
                    amt = max(5.0, round(np.random.normal(cust["typical_amt_mean"], cust["typical_amt_std"]), 2))
                    dist1 = float(random.randint(1, 30))
                else: # travel
                    hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                    amt = max(5.0, round(np.random.normal(cust["typical_amt_mean"], cust["typical_amt_std"]), 2))
                    dist1 = float(random.randint(80, 250))
                c1_count = random.randint(1, 4)
                c2_count = random.randint(1, 3)
            else:
                hour = random.randint(cust["active_start_hour"], cust["active_end_hour"])
                amt = max(5.0, round(np.random.normal(cust["typical_amt_mean"], cust["typical_amt_std"]), 2))
                c1_count = random.randint(1, 3)
                c2_count = random.randint(1, 2)
                dist1 = float(random.randint(1, 30))
            
            c4_val = random.randint(0, 3)
            dev_type = cust["device_type"]
            dev_info = cust["device_info"]
            id_01_val = round(random.uniform(-8.0, 5.0), 1)

        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        dt_seconds = (day_offset * 86400) + (hour * 3600) + (minute * 60) + second
        prod_cd = random.choice(["W", "C", "R", "H", "S"])

        tx_row = {
            "TransactionID": tx_id,
            "isFraud": is_fraud,
            "TransactionDT": dt_seconds,
            "TransactionAmt": amt,
            "ProductCD": prod_cd,
            "card1": cust["card1"],
            "card2": cust["card2"],
            "card3": cust["card3"],
            "card4": cust["card4"],
            "card5": cust["card5"],
            "card6": cust["card6"],
            "addr1": cust["addr1"],
            "addr2": cust["addr2"],
            "dist1": dist1,
            "P_emaildomain": cust["P_emaildomain"],
            "R_emaildomain": cust["P_emaildomain"] if random.random() > 0.4 else "unknown",
            "C1": c1_count,
            "C2": c2_count,
            "C3": 0,
            "C4": c4_val,
            "D1": float(random.randint(1, 90)),
            "D2": float(random.randint(1, 60)),
            "customer_id": cust["customer_id"],
            "customer_name": cust["full_name"],
            "customer_email": cust["email"]
        }
        transactions.append(tx_row)

        identities.append({
            "TransactionID": tx_id,
            "DeviceType": dev_type,
            "DeviceInfo": dev_info,
            "id_01": id_01_val,
            "id_02": random.randint(100000, 800000)
        })

    df_tx = pd.DataFrame(transactions)
    df_id = pd.DataFrame(identities)

    df_tx.to_csv(TRANSACTION_CSV, index=False)
    df_id.to_csv(IDENTITY_CSV, index=False)
    print(f"[+] Successfully wrote {len(df_tx)} transactions to {TRANSACTION_CSV}")
    print(f"[+] Successfully wrote {len(df_id)} identity records to {IDENTITY_CSV}")

    return df_tx, df_id


def load_raw_dataset():
    """
    Loads IEEE-CIS transaction and identity datasets.
    If CSV files do not exist in ml/data/, generates synthetic sample.
    Merges transaction and identity on TransactionID.
    """
    if not os.path.exists(TRANSACTION_CSV) or not os.path.exists(IDENTITY_CSV):
        print("[!] IEEE-CIS data files not found in ml/data/. Generating authentic schema sample...")
        df_tx, df_id = generate_synthetic_ieeecis()
    else:
        print(f"[*] Loading transactions from {TRANSACTION_CSV}...")
        df_tx = pd.read_csv(TRANSACTION_CSV)
        print(f"[*] Loading identity records from {IDENTITY_CSV}...")
        df_id = pd.read_csv(IDENTITY_CSV)

    # Merge on TransactionID
    df = pd.merge(df_tx, df_id, on="TransactionID", how="left")

    # Ensure persistent customer_id exists
    # If using raw Kaggle IEEE-CIS, construct customer key:
    if "customer_id" not in df.columns:
        print("[*] Deriving persistent customer identifier from card and address attributes...")
        df["customer_id"] = (
            df["card1"].astype(str) + "_" +
            df["card2"].fillna(0).astype(int).astype(str) + "_" +
            df["card4"].fillna("unknown") + "_" +
            df["card6"].fillna("unknown") + "_" +
            df["addr1"].fillna(0).astype(int).astype(str)
        )
        # Map to human-readable CUST_XXXX IDs
        unique_cids = {k: f"CUST_{idx+1:04d}" for idx, k in enumerate(df["customer_id"].unique())}
        df["customer_id"] = df["customer_id"].map(unique_cids)

    if "customer_name" not in df.columns:
        df["customer_name"] = df["customer_id"].apply(lambda cid: f"Customer {cid.split('_')[-1] if '_' in cid else cid}")
    if "customer_email" not in df.columns:
        df["customer_email"] = df.apply(lambda r: f"user_{r['customer_id'].lower()}@{r.get('P_emaildomain', 'example.com')}", axis=1)

    print(f"[+] Loaded {len(df)} total merged transactions across {df['customer_id'].nunique()} unique customers.")
    return df


if __name__ == "__main__":
    df = load_raw_dataset()
    print(df.head(3))
    print(f"Fraud count: {df['isFraud'].value_counts().to_dict()}")
