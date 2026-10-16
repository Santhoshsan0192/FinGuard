package com.finguard.dto;

/**
 * Request payload when an analyst marks an alert status.
 * Example: UNDER_REVIEW, CONFIRMED_FRAUD, DISMISSED.
 */
public class AlertStatusUpdateRequest {

    private String status;
    private String analystNotes;

    public AlertStatusUpdateRequest() {}

    public AlertStatusUpdateRequest(String status, String analystNotes) {
        this.status = status;
        this.analystNotes = analystNotes;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAnalystNotes() { return analystNotes; }
    public void setAnalystNotes(String analystNotes) { this.analystNotes = analystNotes; }
}
