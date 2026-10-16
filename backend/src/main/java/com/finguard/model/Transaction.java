package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Transaction entity - Stores individual customer transactions scored by batch pipeline.
 */
@Document(collection = "transactions")
public class Transaction {

    @Id
    private String id; // batch_id + "_" + transaction_id

    @Field("transaction_id")
    private Long transactionId;

    @Field("batch_id")
    private String batchId;

    @Field("customer_id")
    private String customerId;

    private Double amount;

    @Field("product_cd")
    private String productCd;

    private String card4;
    private String card6;

    @Field("device_type")
    private String deviceType;

    @Field("device_info")
    private String deviceInfo;

    @Field("hour_of_day")
    private Integer hourOfDay;

    @Field("day_of_week")
    private Integer dayOfWeek;

    @Field("TransactionDT")
    private Long transactionDt;

    private String timestamp;

    @Field("cold_start_customer_flag")
    private Integer coldStartCustomerFlag;

    @Field("is_fraud_ground_truth")
    private Integer isFraudGroundTruth;

    @Field("created_at")
    private String createdAt;

    public Transaction() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public Long getTransactionId() { return transactionId; }
    public void setTransactionId(Long transactionId) { this.transactionId = transactionId; }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getProductCd() { return productCd; }
    public void setProductCd(String productCd) { this.productCd = productCd; }

    public String getCard4() { return card4; }
    public void setCard4(String card4) { this.card4 = card4; }

    public String getCard6() { return card6; }
    public void setCard6(String card6) { this.card6 = card6; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public Integer getHourOfDay() { return hourOfDay; }
    public void setHourOfDay(Integer hourOfDay) { this.hourOfDay = hourOfDay; }

    public Integer getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(Integer dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public Long getTransactionDt() { return transactionDt; }
    public void setTransactionDt(Long transactionDt) { this.transactionDt = transactionDt; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public Integer getColdStartCustomerFlag() { return coldStartCustomerFlag; }
    public void setColdStartCustomerFlag(Integer coldStartCustomerFlag) { this.coldStartCustomerFlag = coldStartCustomerFlag; }

    public Integer getIsFraudGroundTruth() { return isFraudGroundTruth; }
    public void setIsFraudGroundTruth(Integer isFraudGroundTruth) { this.isFraudGroundTruth = isFraudGroundTruth; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
