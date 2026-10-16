package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * BehaviourProfile entity - Precomputed customer baselines created during batch feature engineering.
 */
@Document(collection = "behaviour_profiles")
public class BehaviourProfile {

    @Id
    private String id; // customer_id

    @Field("customer_id")
    private String customerId;

    @Field("baseline_avg_amt")
    private Double baselineAvgAmt;

    @Field("baseline_std_amt")
    private Double baselineStdAmt;

    @Field("baseline_median_amt")
    private Double baselineMedianAmt;

    @Field("total_transactions")
    private Integer totalTransactions;

    @Field("typical_active_hours")
    private String typicalActiveHours;

    @Field("primary_device")
    private String primaryDevice;

    @Field("primary_card")
    private String primaryCard;

    @Field("last_updated")
    private String lastUpdated;

    public BehaviourProfile() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Double getBaselineAvgAmt() { return baselineAvgAmt; }
    public void setBaselineAvgAmt(Double baselineAvgAmt) { this.baselineAvgAmt = baselineAvgAmt; }

    public Double getBaselineStdAmt() { return baselineStdAmt; }
    public void setBaselineStdAmt(Double baselineStdAmt) { this.baselineStdAmt = baselineStdAmt; }

    public Double getBaselineMedianAmt() { return baselineMedianAmt; }
    public void setBaselineMedianAmt(Double baselineMedianAmt) { this.baselineMedianAmt = baselineMedianAmt; }

    public Integer getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(Integer totalTransactions) { this.totalTransactions = totalTransactions; }

    public String getTypicalActiveHours() { return typicalActiveHours; }
    public void setTypicalActiveHours(String typicalActiveHours) { this.typicalActiveHours = typicalActiveHours; }

    public String getPrimaryDevice() { return primaryDevice; }
    public void setPrimaryDevice(String primaryDevice) { this.primaryDevice = primaryDevice; }

    public String getPrimaryCard() { return primaryCard; }
    public void setPrimaryCard(String primaryCard) { this.primaryCard = primaryCard; }

    public String getLastUpdated() { return lastUpdated; }
    public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }
}
