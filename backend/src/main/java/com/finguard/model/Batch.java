package com.finguard.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

/**
 * Batch entity - Records metadata, timestamps, throughput, and status
 * for each non-destructive batch run processed by FinGuard ML pipeline.
 */
@Document(collection = "batches")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Batch {

    @Id
    private String id;

    @Field("batch_id")
    @JsonAlias({"batch_id", "batchId"})
    private String batchId;

    @Field("model_version")
    @JsonAlias({"model_version", "modelVersion"})
    private String modelVersion;

    @Field("dataset_version")
    @JsonAlias({"dataset_version", "datasetVersion"})
    private String datasetVersion;

    @Field("calibration_method")
    @JsonAlias({"calibration_method", "calibrationMethod"})
    private String calibrationMethod;

    @Field("is_calibrated")
    @JsonAlias({"is_calibrated", "isCalibrated"})
    private Boolean isCalibrated;

    @Field("calibration_note")
    @JsonAlias({"calibration_note", "calibrationNote"})
    private String calibrationNote;

    @Field("started_at")
    @JsonAlias({"started_at", "startedAt"})
    private String startedAt;

    @Field("completed_at")
    @JsonAlias({"completed_at", "completedAt"})
    private String completedAt;

    @Field("transaction_count")
    @JsonAlias({"transaction_count", "transactionCount"})
    private Integer transactionCount;

    @Field("fraud_count")
    @JsonAlias({"fraud_count", "fraudCount"})
    private Integer fraudCount;

    @Field("high_risk_count")
    @JsonAlias({"high_risk_count", "highRiskCount"})
    private Integer highRiskCount;

    @Field("medium_risk_count")
    @JsonAlias({"medium_risk_count", "mediumRiskCount"})
    private Integer mediumRiskCount;

    @Field("low_risk_count")
    @JsonAlias({"low_risk_count", "lowRiskCount"})
    private Integer lowRiskCount;

    @Field("risk_thresholds")
    @JsonAlias({"risk_thresholds", "riskThresholds"})
    private Map<String, Object> riskThresholds;

    @Field("processing_time_seconds")
    @JsonAlias({"processing_time_seconds", "processingTimeSeconds"})
    private Double processingTimeSeconds;

    private String status;

    @Field("global_feature_importance")
    @JsonAlias({"global_feature_importance", "globalFeatureImportance"})
    private List<Map<String, Object>> globalFeatureImportance;

    public Batch() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getDatasetVersion() { return datasetVersion; }
    public void setDatasetVersion(String datasetVersion) { this.datasetVersion = datasetVersion; }

    public String getCalibrationMethod() { return calibrationMethod; }
    public void setCalibrationMethod(String calibrationMethod) { this.calibrationMethod = calibrationMethod; }

    public Boolean getIsCalibrated() { return isCalibrated; }
    public void setIsCalibrated(Boolean isCalibrated) { this.isCalibrated = isCalibrated; }

    public String getCalibrationNote() { return calibrationNote; }
    public void setCalibrationNote(String calibrationNote) { this.calibrationNote = calibrationNote; }

    public String getStartedAt() { return startedAt; }
    public void setStartedAt(String startedAt) { this.startedAt = startedAt; }

    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public Integer getTransactionCount() { return transactionCount; }
    public void setTransactionCount(Integer transactionCount) { this.transactionCount = transactionCount; }

    public Integer getFraudCount() { return fraudCount; }
    public void setFraudCount(Integer fraudCount) { this.fraudCount = fraudCount; }

    public Integer getHighRiskCount() { return highRiskCount; }
    public void setHighRiskCount(Integer highRiskCount) { this.highRiskCount = highRiskCount; }

    public Integer getMediumRiskCount() { return mediumRiskCount; }
    public void setMediumRiskCount(Integer mediumRiskCount) { this.mediumRiskCount = mediumRiskCount; }

    public Integer getLowRiskCount() { return lowRiskCount; }
    public void setLowRiskCount(Integer lowRiskCount) { this.lowRiskCount = lowRiskCount; }

    public Map<String, Object> getRiskThresholds() { return riskThresholds; }
    public void setRiskThresholds(Map<String, Object> riskThresholds) { this.riskThresholds = riskThresholds; }

    public Double getProcessingTimeSeconds() { return processingTimeSeconds; }
    public void setProcessingTimeSeconds(Double processingTimeSeconds) { this.processingTimeSeconds = processingTimeSeconds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<Map<String, Object>> getGlobalFeatureImportance() { return globalFeatureImportance; }
    public void setGlobalFeatureImportance(List<Map<String, Object>> globalFeatureImportance) { this.globalFeatureImportance = globalFeatureImportance; }
}
