"""
FinGuard Isolated Behavioural Model Integration - SHAP Explanation Adapter
Adapts raw TreeSHAP feature attributions into Spring Boot and MongoDB compatible
explanation schemas (TopFactor, positive_drivers, negative_drivers, primary_driver),
with objective, non-fabricated human-readable descriptions for all 397 features.
"""

from datetime import datetime, timezone
import numpy as np


def format_feature_description(feat_name, val, shap_val):
    """
    Translates SHAP attributions and observed feature values into accurate, plain-English
    decision support descriptions for fraud analysts without misrepresenting feature causality.

    Parameters:
        feat_name (str): Technical column name.
        val (float or None): Observed feature value.
        shap_val (float): SHAP attribution in margin (log-odds) space.

    Returns:
        str: Human-readable explanation factor description.
    """
    direction = "increases" if shap_val > 0 else "reduces"
    val_str = f"{val:.2f}" if (val is not None and not np.isnan(val)) else "N/A"

    if feat_name == "amount_deviation":
        if val is not None and not np.isnan(val):
            pct = val * 100.0
            return (
                f"Transaction amount deviates by {pct:+.1f}% relative to card historical average "
                f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
            )
        return f"Transaction amount deviation from card baseline ({direction} fraud risk; SHAP: {shap_val:+.3f})"

    elif feat_name == "prior_amount_mean":
        if val is not None and not np.isnan(val):
            return (
                f"Card historical baseline average: ${val:,.2f} "
                f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
            )
        return f"First observed transaction for card profile (cold start; SHAP: {shap_val:+.3f})"

    elif feat_name == "prior_card_count":
        if val is not None and not np.isnan(val):
            count_int = int(val)
            if count_int == 0:
                return f"First observed transaction for card profile (cold start; SHAP: {shap_val:+.3f})"
            return (
                f"Recorded historical transaction count on this card: {count_int} "
                f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
            )
        return f"Historical transaction count on card profile ({direction} fraud risk; SHAP: {shap_val:+.3f})"

    elif feat_name in ("time_sin", "time_cos"):
        return (
            f"Diurnal cyclical transaction timing component ({feat_name} = {val_str}, "
            f"{direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name == "TransactionAmt":
        if val is not None and not np.isnan(val):
            return (
                f"Transaction dollar amount: ${val:,.2f} "
                f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
            )
        return f"Transaction dollar amount ({direction} fraud risk; SHAP: {shap_val:+.3f})"

    elif feat_name in ("dist1", "dist2"):
        if val is not None and not np.isnan(val):
            return (
                f"Geographic distance metric between billing address and postal code: {val:.0f} miles "
                f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
            )
        return f"Geographic distance metric {feat_name} ({direction} fraud risk; SHAP: {shap_val:+.3f})"

    elif feat_name in ("addr1", "addr2"):
        return (
            f"Billing/shipping geographic region code {feat_name} = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name.startswith("card"):
        return (
            f"Payment card attribute {feat_name} = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name in ("P_emaildomain", "R_emaildomain"):
        return (
            f"Email domain identifier {feat_name} code = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name.startswith("C"):
        return (
            f"Transaction velocity / phone-card association count {feat_name} = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name.startswith("D"):
        return (
            f"Timedelta interval from prior event {feat_name} = {val_str} days "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name.startswith("M"):
        return (
            f"Cardholder identity and address matching flag {feat_name} = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    elif feat_name.startswith("V"):
        return (
            f"Vesta payment velocity indicator {feat_name} = {val_str} "
            f"({direction} fraud risk; SHAP: {shap_val:+.3f})"
        )

    return f"{feat_name} = {val_str} ({direction} fraud risk by {abs(shap_val):.3f})"


def get_feature_display_title(feat_name):
    """
    Returns a clean, human-readable display title for dashboard feature importance charts.
    """
    if feat_name == "amount_deviation":
        return "Amount Deviation from Card Baseline"
    elif feat_name == "prior_amount_mean":
        return "Card Prior Historical Mean Spend"
    elif feat_name == "prior_card_count":
        return "Card Historical Transaction Count"
    elif feat_name == "time_sin":
        return "Cyclical Time Factor (Sine Component)"
    elif feat_name == "time_cos":
        return "Cyclical Time Factor (Cosine Component)"
    elif feat_name == "TransactionAmt":
        return "Transaction Dollar Amount"
    elif feat_name == "dist1":
        return "Geographic Billing Distance (dist1)"
    elif feat_name == "dist2":
        return "Postal Location Distance (dist2)"
    elif feat_name.startswith("card"):
        return f"Card Profile Attribute ({feat_name})"
    elif feat_name.startswith("addr"):
        return f"Billing/Shipping Region ({feat_name})"
    elif feat_name == "P_emaildomain":
        return "Purchaser Email Domain Provider"
    elif feat_name == "R_emaildomain":
        return "Recipient Email Domain Provider"
    elif feat_name.startswith("C"):
        return f"Velocity / Association Counter ({feat_name})"
    elif feat_name.startswith("D"):
        return f"Time Delta Since Prior Activity ({feat_name})"
    elif feat_name.startswith("M"):
        return f"Identity & Address Match Indicator ({feat_name})"
    elif feat_name.startswith("V"):
        return f"Vesta Payment Behavioural Factor ({feat_name})"
    return feat_name.replace("_", " ").title()


def determine_primary_risk_driver(positive_drivers):
    """
    Resolves the primary risk driver category from the top positive SHAP factors.

    Parameters:
        positive_drivers (list of dict): Factors sorted by positive SHAP value descending.

    Returns:
        str: Category name conforming to FinGuard decision support standards.
    """
    if not positive_drivers:
        return "Baseline Model Risk"

    top_feat = positive_drivers[0]["feature"]

    if top_feat in ("amount_deviation", "prior_amount_mean"):
        return "Amount Deviation from Baseline"
    elif top_feat == "TransactionAmt":
        return "Transaction Amount Elevation"
    elif top_feat in ("prior_card_count",) or top_feat.startswith("C"):
        return "Transaction Velocity Spike"
    elif top_feat in ("time_sin", "time_cos"):
        return "Diurnal Timing Anomaly"
    elif top_feat.startswith("D"):
        return "Activity Interval Anomaly"
    elif top_feat in ("dist1", "dist2", "addr1", "addr2"):
        return "Geographic Distance Anomaly"
    elif top_feat.startswith("M"):
        return "Identity Verification Discrepancy"
    elif top_feat in ("P_emaildomain", "R_emaildomain"):
        return "Email Domain Risk"
    elif top_feat.startswith("V"):
        return "Payment Behavioural Anomaly"

    return "Behavioural Baseline Deviation"


def adapt_single_explanation(
    tx_id,
    batch_id,
    customer_id,
    row_values,
    row_shaps,
    feature_names,
    base_value=0.0,
    top_k_factors=6,
    max_drivers=5,
    timestamp=None
):
    """
    Transforms a single transaction's SHAP vector into the exact FinGuard Explanation document.

    Returns:
        dict: Fully compliant Spring Boot Explanation document.
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat()

    abs_shaps = np.abs(row_shaps)
    sorted_indices = np.argsort(abs_shaps)[::-1]

    top_factors = []
    positive_drivers = []
    negative_drivers = []

    for rank, idx in enumerate(sorted_indices):
        f_name = feature_names[idx]
        raw_val = row_values[idx]
        f_val = float(raw_val) if (raw_val is not None and not np.isnan(raw_val)) else None
        s_val = float(row_shaps[idx])
        impact = "INCREASES_RISK" if s_val > 0 else "DECREASES_RISK"
        desc = format_feature_description(f_name, f_val, s_val)

        factor_item = {
            "feature": f_name,
            "value": round(f_val, 4) if f_val is not None else None,
            "shap_value": round(s_val, 4),
            "impact": impact,
            "description": desc
        }

        if rank < top_k_factors:
            top_factors.append(factor_item)

        if s_val > 0:
            positive_drivers.append(factor_item)
        elif s_val < 0:
            negative_drivers.append(factor_item)

    # Sort positive descending, negative ascending (most mitigating first)
    positive_drivers.sort(key=lambda x: x["shap_value"], reverse=True)
    negative_drivers.sort(key=lambda x: x["shap_value"])

    primary_driver = determine_primary_risk_driver(positive_drivers)

    explanation_doc = {
        "_id": f"{batch_id}_{tx_id}",
        "transaction_id": int(tx_id),
        "batch_id": str(batch_id),
        "customer_id": str(customer_id),
        "base_value": round(float(base_value), 4),
        "top_factors": top_factors,
        "positive_drivers": positive_drivers[:max_drivers],
        "negative_drivers": negative_drivers[:max_drivers],
        "primary_risk_driver": primary_driver,
        "generated_at": timestamp
    }

    return explanation_doc


def adapt_global_importance(mean_abs_shap, feature_names, top_n=15):
    """
    Assembles the batch global feature importance list with pre-populated descriptions,
    allowing DashboardService to consume them directly without requiring hardcoded Java maps.
    """
    sorted_indices = np.argsort(mean_abs_shap)[::-1][:top_n]
    global_importance = []

    for idx in sorted_indices:
        f_name = feature_names[idx]
        imp = round(float(mean_abs_shap[idx]), 4)
        desc = get_feature_display_title(f_name)
        global_importance.append({
            "feature": f_name,
            "importance": imp,
            "description": desc
        })

    return global_importance
