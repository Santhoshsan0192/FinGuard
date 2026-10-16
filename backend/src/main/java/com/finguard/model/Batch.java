package com.finguard.model;

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
public class Batch {

    @Id
    private String id;

    @Field("batch_id")
    private String batchId;

    @Field("model_version")
    private String modelVersion;

    @Field("dataset_version")
    private String datasetVersion;

    @Field("started_at")
    private String startedAt;

    @Field("completed_at")
    private String completedAt;

    @Field("transaction_count")
    private Integer transactionCount;

    @Field("fraud_count")
    private Integer fraudCount;

    @Field("high_risk_count")
    private Integer highRiskCount;

    @Field("medium_risk_count")
    private Integer mediumRiskCount;

    @Field("low_risk_count")
    private Integer lowRiskCount;

    @Field("risk_thresholds")
    private Map<String, Object> riskThresholds;

    @Field("processing_time_seconds")
    private Double processingTimeSeconds;

    private String status;

    @Field("global_feature_importance")
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
