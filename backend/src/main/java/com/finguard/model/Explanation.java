package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

/**
 * Explanation entity - SHAP TreeExplainer values and top contributing risk factors.
 */
@Document(collection = "explanations")
public class Explanation {

    @Id
    private String id;

    @Field("transaction_id")
    private Long transactionId;

    @Field("batch_id")
    private String batchId;

    @Field("customer_id")
    private String customerId;

    @Field("base_value")
    private Double baseValue;

    @Field("top_factors")
    private List<TopFactor> topFactors;

    @Field("positive_drivers")
    private List<TopFactor> positiveDrivers;

    @Field("negative_drivers")
    private List<TopFactor> negativeDrivers;

    @Field("generated_at")
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

    public String getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(String generatedAt) { this.generatedAt = generatedAt; }
}
