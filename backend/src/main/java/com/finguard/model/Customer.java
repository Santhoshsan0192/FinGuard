package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Customer entity - Read-only reference populated by ML batch pipeline.
 */
@Document(collection = "customers")
public class Customer {

    @Id
    private String id; // customer_id

    @Field("customer_id")
    private String customerId;

    @Field("full_name")
    private String fullName;

    @Field("name")
    private String name;

    private String email;
    private Integer card1;
    private String card4;
    private String card6;
    private Double addr1;
    private Double addr2;

    @Field("primary_device")
    private String primaryDevice;

    private String status;

    @Field("created_at")
    private String createdAt;

    public Customer() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCustomerId() { return customerId; }
    public void setCustomerId(String customerId) { this.customerId = customerId; }

    public String getFullName() { 
        if (fullName != null && !fullName.startsWith("Customer ") && !fullName.isBlank()) {
            return fullName;
        }
        if (name != null && !name.isBlank()) {
            return name;
        }
        return fullName; 
    }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getName() {
        if (name != null && !name.isBlank()) {
            return name;
        }
        return fullName;
    }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getCard1() { return card1; }
    public void setCard1(Integer card1) { this.card1 = card1; }

    public String getCard4() { return card4; }
    public void setCard4(String card4) { this.card4 = card4; }

    public String getCard6() { return card6; }
    public void setCard6(String card6) { this.card6 = card6; }

    public Double getAddr1() { return addr1; }
    public void setAddr1(Double addr1) { this.addr1 = addr1; }

    public Double getAddr2() { return addr2; }
    public void setAddr2(Double addr2) { this.addr2 = addr2; }

    public String getPrimaryDevice() { return primaryDevice; }
    public void setPrimaryDevice(String primaryDevice) { this.primaryDevice = primaryDevice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
