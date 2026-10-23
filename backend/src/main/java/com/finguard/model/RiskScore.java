package com.finguard.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * RiskScore entity - XGBoost prediction scores (0-100) and severity classifications.
 */
@Document(collection = "risk_scores")
@JsonIgnoreProperties(ignoreUnknown = true)
public class RiskScore {

    @Id
    private String id;

    @Field("transaction_id")
    @JsonAlias({"transaction_id", "transactionId"})
    private Long transactionId;

    @Field("batch_id")
    @JsonAlias({"batch_id", "batchId"})
    private String batchId;

    @Field("customer_id")
    @JsonAlias({"customer_id", "customerId"})
    private String customerId;

    @Field("risk_score")
    @JsonAlias({"risk_score", "riskScore"})
    private Double riskScore;

    @Field("risk_level")
    @JsonAlias({"risk_level", "riskLevel"})
    private String riskLevel; // HIGH, MEDIUM, LOW

    @Field("raw_probability")
    @JsonAlias({"raw_probability", "rawProbability"})
    private Double rawProbability;

    @Field("calibrated_probability")
    @JsonAlias({"calibrated_probability", "calibratedProbability"})
    private Double calibratedProbability;

    @Field("calibration_method")
    @JsonAlias({"calibration_method", "calibrationMethod"})
    private String calibrationMethod;

    @Field("is_calibrated")
    @JsonAlias({"is_calibrated", "isCalibrated"})
    private Boolean isCalibrated;

    @Field("calibration_note")
    @JsonAlias({"calibration_note", "calibrationNote"})
    private String calibrationNote;

    @Field("model_version")
    @JsonAlias({"model_version", "modelVersion"})
    private String modelVersion;

    @Field("scored_at")
    @JsonAlias({"scored_at", "scoredAt"})
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

    public String getCalibrationMethod() { return calibrationMethod; }
    public void setCalibrationMethod(String calibrationMethod) { this.calibrationMethod = calibrationMethod; }

    public Boolean getIsCalibrated() { return isCalibrated; }
    public void setIsCalibrated(Boolean isCalibrated) { this.isCalibrated = isCalibrated; }

    public String getCalibrationNote() { return calibrationNote; }
    public void setCalibrationNote(String calibrationNote) { this.calibrationNote = calibrationNote; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getScoredAt() { return scoredAt; }
    public void setScoredAt(String scoredAt) { this.scoredAt = scoredAt; }
}
