package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Alert entity - Analyst decision support queue item.
 * Mutable by fraud analysts (status updates, notes).
 */
@Document(collection = "alerts")
public class Alert {

    @Id
    private String id; // alert_id

    @Field("alert_id")
    private String alertId;

    @Field("transaction_id")
    private Long transactionId;

    @Field("batch_id")
    private String batchId;

    @Field("customer_id")
    private String customerId;

    @Field("customer_name")
    private String customerName;

    private Double amount;

    @Field("risk_score")
    private Double riskScore;

    @Field("risk_level")
    private String riskLevel; // HIGH, MEDIUM, LOW

    @Field("primary_risk_driver")
    private String primaryRiskDriver;

    @Field("cold_start_flag")
    private Integer coldStartFlag;

    private String status; // NEW, UNDER_REVIEW, CONFIRMED_FRAUD, DISMISSED

    private String timestamp;

    @Field("created_at")
    private String createdAt;

    @Field("analyst_notes")
    private String analystNotes;

    public Alert() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Double getRiskScore() { return riskScore; }
    public void setRiskScore(Double riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getPrimaryRiskDriver() { return primaryRiskDriver; }
    public void setPrimaryRiskDriver(String primaryRiskDriver) { this.primaryRiskDriver = primaryRiskDriver; }

    public Integer getColdStartFlag() { return coldStartFlag; }
    public void setColdStartFlag(Integer coldStartFlag) { this.coldStartFlag = coldStartFlag; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getAnalystNotes() { return analystNotes; }
    public void setAnalystNotes(String analystNotes) { this.analystNotes = analystNotes; }
}
