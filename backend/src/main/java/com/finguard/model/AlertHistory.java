package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;


@Document(collection = "alert_history")
public class AlertHistory {

    @Id
    private String id;

    @Field("alert_id")
    private String alertId;

    @Field("previous_status")
    private String previousStatus;

    @Field("new_status")
    private String newStatus;

    @Field("analyst_username")
    private String analystUsername;

    @Field("analyst_notes")
    private String analystNotes;

    @Field("timestamp")
    private String timestamp;

    public AlertHistory() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public String getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(String previousStatus) { this.previousStatus = previousStatus; }

    public String getNewStatus() { return newStatus; }
    public void setNewStatus(String newStatus) { this.newStatus = newStatus; }

    public String getAnalystUsername() { return analystUsername; }
    public void setAnalystUsername(String analystUsername) { this.analystUsername = analystUsername; }

    public String getAnalystNotes() { return analystNotes; }
    public void setAnalystNotes(String analystNotes) { this.analystNotes = analystNotes; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
}
