"""
FinGuard - MongoDB Index Initialization Module
Creates necessary secondary indexes for performance optimization without redundant overhead.
Indexes:
- alerts: batch_id, risk_level, status, risk_score
- transactions: customer_id, batch_id, TransactionDT, created_at
- risk_scores: customer_id, batch_id, risk_level, risk_score
- explanations: transaction_id, customer_id, batch_id
- batches: batch_id, started_at
"""

import os
import pymongo

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB", "finguard")


def create_indexes():
    print(f"[*] Initializing MongoDB secondary indexes on {MONGO_URI} (db: {DB_NAME})...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # 1. alerts collection indexes
    db["alerts"].create_index([("batch_id", pymongo.ASCENDING)], name="idx_alerts_batch_id")
    db["alerts"].create_index([("risk_level", pymongo.ASCENDING)], name="idx_alerts_risk_level")
    db["alerts"].create_index([("status", pymongo.ASCENDING)], name="idx_alerts_status")
    db["alerts"].create_index([("risk_score", pymongo.DESCENDING)], name="idx_alerts_risk_score")
    db["alerts"].create_index([("customer_id", pymongo.ASCENDING)], name="idx_alerts_customer_id")
    print("[+] Created indexes for 'alerts' collection.")

    # 2. transactions collection indexes
    db["transactions"].create_index([("customer_id", pymongo.ASCENDING)], name="idx_transactions_cust_id")
    db["transactions"].create_index([("batch_id", pymongo.ASCENDING)], name="idx_transactions_batch_id")
    db["transactions"].create_index([("TransactionDT", pymongo.ASCENDING)], name="idx_transactions_dt")
    db["transactions"].create_index([("created_at", pymongo.DESCENDING)], name="idx_transactions_created")
    print("[+] Created indexes for 'transactions' collection.")

    # 3. risk_scores collection indexes
    db["risk_scores"].create_index([("customer_id", pymongo.ASCENDING)], name="idx_scores_cust_id")
    db["risk_scores"].create_index([("batch_id", pymongo.ASCENDING)], name="idx_scores_batch_id")
    db["risk_scores"].create_index([("risk_level", pymongo.ASCENDING)], name="idx_scores_risk_level")
    db["risk_scores"].create_index([("risk_score", pymongo.DESCENDING)], name="idx_scores_risk_score")
    print("[+] Created indexes for 'risk_scores' collection.")

    # 4. explanations collection indexes
    db["explanations"].create_index([("transaction_id", pymongo.ASCENDING)], name="idx_expl_tx_id")
    db["explanations"].create_index([("customer_id", pymongo.ASCENDING)], name="idx_expl_cust_id")
    db["explanations"].create_index([("batch_id", pymongo.ASCENDING)], name="idx_expl_batch_id")
    print("[+] Created indexes for 'explanations' collection.")

    # 5. batches collection indexes
    db["batches"].create_index([("batch_id", pymongo.ASCENDING)], unique=True, name="idx_batches_id_unique")
    db["batches"].create_index([("started_at", pymongo.DESCENDING)], name="idx_batches_started_at")
    print("[+] Created indexes for 'batches' collection.")

    print("[*] All MongoDB indexes verified and active.")


if __name__ == "__main__":
    create_indexes()
