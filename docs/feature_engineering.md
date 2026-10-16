# FinGuard: Feature Engineering & Cold-Start Protocol

## 1. Overview

**Status:** IMPLEMENTED AND VERIFIED

FinGuard preserves 23 core model features for complete backward compatibility while defining an extended 38-feature catalog incorporating multi-horizon rolling spend windows, velocity bursts, and cold-start flags.

## 2. Core 23 Features Catalog

| # | Feature Name | Type | Description | Leakage Safeguard |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `TransactionAmt` | Numeric | Transaction dollar amount ($) | Raw transaction property |
| 2 | `amt_to_baseline_ratio` | Numeric | Ratio of current amount to historical mean | Uses historical mean prior to $t_i$ |
| 3 | `amt_zscore` | Numeric | Z-score deviation from historical standard deviation | Uses historical $\sigma$ prior to $t_i$ |
| 4 | `velocity_hours_since_last_tx` | Numeric | Elapsed hours since previous customer transaction | Difference with preceding transaction |
| 5 | `velocity_rapid_tx_flag` | Binary | Flag indicating rapid transaction within 15 mins (<0.25h) | Causal previous transaction check |
| 6 | `is_off_hours` | Binary | Flag indicating activity outside customer's typical 10th-90th percentile hours | Built from historical hour distribution |
| 7 | `tx_freq_24h` | Numeric | Count of customer transactions in trailing 24 hours | Trailing causal window $[t_i - 86400, t_i]$ |
| 8 | `amt_sum_24h` | Numeric | Total dollar spend in trailing 24 hours | Trailing causal window $[t_i - 86400, t_i]$ |
| 9 | `spend_24h_to_baseline_ratio` | Numeric | Ratio of 24h spend to historical average | Normalized against prior baseline |
| 10 | `device_anomaly_flag` | Binary | Flag indicating device differs from customer's primary device | Evaluates against devices seen prior to $t_i$ |
| 11 | `hour_of_day` | Numeric | Transaction execution hour [0 – 23] | `(TransactionDT // 3600) % 24` |
| 12 | `day_of_week` | Numeric | Transaction day of week [0 – 6] | `(TransactionDT // 86400) % 7` |
| 13 | `baseline_avg_amt` | Numeric | Historical average transaction amount ($) | Causal historical average |
| 14 | `C1` | Numeric | IEEE-CIS counting metric 1 (velocity counter) | Benchmark property |
| 15 | `C2` | Numeric | IEEE-CIS counting metric 2 (frequency counter) | Benchmark property |
| 16 | `C4` | Numeric | IEEE-CIS counting metric 4 | Benchmark property |
| 17 | `D1` | Numeric | Timedelta metric 1 (days since prior event) | Benchmark property |
| 18 | `D2` | Numeric | Timedelta metric 2 | Benchmark property |
| 19 | `dist1` | Numeric | Distance from billing address (miles) | Benchmark property |
| 20 | `ProductCD_enc` | Categorical | Deterministic encoding for product code | Pre-defined mapping (W=0, H=1, C=2, R=3, S=4) |
| 21 | `card4_enc` | Categorical | Deterministic encoding for card brand | visa=0, mastercard=1, discover=2, amex=3 |
| 22 | `card6_enc` | Categorical | Deterministic encoding for card type | debit=0, credit=1 |
| 23 | `DeviceType_enc` | Categorical | Deterministic encoding for device type | desktop=0, mobile=1 |

## 3. Extended Feature Catalog (Phase 8 & 9)

In addition to the core 23 features, FinGuard defines 15 extended features:
- Multi-horizon rolling frequency: `transactions_1h`, `transactions_6h`, `transactions_24h`
- Multi-horizon rolling volume: `amount_1h`, `amount_6h`, `amount_24h`
- Fine-grained velocity: `time_since_last_transaction`
- Device and credential drift: `device_change_count`, `new_device_flag`, `new_card_flag`
- Geographic movement: `location_change_flag`
- Temporal risk flags: `night_transaction_flag`, `weekend_transaction_flag`
- History depth: `customer_transaction_count`, `cold_start_customer_flag`

## 4. Cold-Start Handling Protocol

When a transaction belongs to a customer with no prior transaction history:
1. `cold_start_customer_flag` is set to `1`.
2. `customer_transaction_count` is set to `0`.
3. Customer baseline statistics fallback to population-level statistics:
   - Population mean amount ($\mu_{\text{pop}} = \$135.00$)
   - Population standard deviation ($\sigma_{\text{pop}} = \$100.00$)
   - Population median amount ($\text{med}_{\text{pop}} = \$68.00$)
   - Population active hours ($08:00 - 22:00$)
4. Velocity hours fallback to neutral high ceiling ($999.0$ hours).
5. The cold-start status is explicitly tagged in the database document and surfaced as a badge in the analyst priority queue.
