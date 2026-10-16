package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * RiskScore entity - XGBoost prediction scores (0-100) and severity classifications.
 */
@Document(collection = "risk_scores")
public class RiskScore {

    @Id
    private String id;

    @Field("transaction_id")
    private Long transactionId;

    @Field("batch_id")
    private String batchId;

    @Field("customer_id")
    private String customerId;

    @Field("risk_score")
    private Double riskScore;

    @Field("risk_level")
    private String riskLevel; // HIGH, MEDIUM, LOW

    @Field("raw_probability")
    private Double rawProbability;

    @Field("calibrated_probability")
    private Double calibratedProbability;

    @Field("model_version")
    private String modelVersion;

    @Field("scored_at")
    private String scoredAt;

    public RiskScore() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Double getRiskScore() { return riskScore; }
    public void setRiskScore(Double riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public Double getRawProbability() { return rawProbability; }
    public void setRawProbability(Double rawProbability) { this.rawProbability = rawProbability; }

    public Double getCalibratedProbability() { return calibratedProbability; }
    public void setCalibratedProbability(Double calibratedProbability) { this.calibratedProbability = calibratedProbability; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getScoredAt() { return scoredAt; }
    public void setScoredAt(String scoredAt) { this.scoredAt = scoredAt; }
}
