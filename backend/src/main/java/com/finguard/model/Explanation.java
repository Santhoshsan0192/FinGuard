package com.finguard.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

/**
 * Explanation entity - SHAP TreeExplainer values and top contributing risk factors.
 */
@Document(collection = "explanations")
@JsonIgnoreProperties(ignoreUnknown = true)
public class Explanation {

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

    @Field("base_value")
    @JsonAlias({"base_value", "baseValue"})
    private Double baseValue;

    @Field("top_factors")
    @JsonAlias({"top_factors", "topFactors"})
    private List<TopFactor> topFactors;

    @Field("positive_drivers")
    @JsonAlias({"positive_drivers", "positiveDrivers"})
    private List<TopFactor> positiveDrivers;

    @Field("negative_drivers")
    @JsonAlias({"negative_drivers", "negativeDrivers"})
    private List<TopFactor> negativeDrivers;

    @Field("primary_risk_driver")
    @JsonAlias({"primary_risk_driver", "primaryRiskDriver"})
    private String primaryRiskDriver;

    @Field("generated_at")
    @JsonAlias({"generated_at", "generatedAt"})
    private String generatedAt;

    public Explanation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Double getBaseValue() { return baseValue; }
    public void setBaseValue(Double baseValue) { this.baseValue = baseValue; }

    public List<TopFactor> getTopFactors() { return topFactors; }
    public void setTopFactors(List<TopFactor> topFactors) { this.topFactors = topFactors; }

    public List<TopFactor> getPositiveDrivers() { return positiveDrivers; }
    public void setPositiveDrivers(List<TopFactor> positiveDrivers) { this.positiveDrivers = positiveDrivers; }

    public List<TopFactor> getNegativeDrivers() { return negativeDrivers; }
    public void setNegativeDrivers(List<TopFactor> negativeDrivers) { this.negativeDrivers = negativeDrivers; }

    public String getPrimaryRiskDriver() { return primaryRiskDriver; }
    public void setPrimaryRiskDriver(String primaryRiskDriver) { this.primaryRiskDriver = primaryRiskDriver; }

    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
}
