package com.finguard.dto;

import java.util.Map;

/**
 * Summary DTO for the fraud analyst dashboard header cards.
 */
public class DashboardSummaryDto {

    private long totalAlerts;
    private long highRiskAlerts;
    private long mediumRiskAlerts;
    private long lowRiskAlerts;
    private long unreviewedAlerts;
    private long activeAlerts;
    private long confirmedFraudAlerts;
    private long falsePositiveAlerts;
    private long escalatedAlerts;
    private double averageRiskScore;
    private double fraudRatePercent;
    private Map<String, Long> riskDistribution;
    private long totalTransactionsScored;
    private java.util.List<Map<String, Object>> riskTrend;
    private java.util.List<Map<String, Object>> topRiskDrivers;
    private Map<String, Object> batchInfo;

    public DashboardSummaryDto() {}

    public long getTotalTransactionsScored() { return totalTransactionsScored; }
    public void setTotalTransactionsScored(long totalTransactionsScored) { this.totalTransactionsScored = totalTransactionsScored; }

    public long getTotalAlerts() { return totalAlerts; }
    public void setTotalAlerts(long totalAlerts) { this.totalAlerts = totalAlerts; }

    public long getHighRiskAlerts() { return highRiskAlerts; }
    public void setHighRiskAlerts(long highRiskAlerts) { this.highRiskAlerts = highRiskAlerts; }

    public long getMediumRiskAlerts() { return mediumRiskAlerts; }
    public void setMediumRiskAlerts(long mediumRiskAlerts) { this.mediumRiskAlerts = mediumRiskAlerts; }

    public long getLowRiskAlerts() { return lowRiskAlerts; }
    public void setLowRiskAlerts(long lowRiskAlerts) { this.lowRiskAlerts = lowRiskAlerts; }

    public long getUnreviewedAlerts() { return unreviewedAlerts; }
    public void setUnreviewedAlerts(long unreviewedAlerts) { this.unreviewedAlerts = unreviewedAlerts; }

    public long getActiveAlerts() { return activeAlerts; }
    public void setActiveAlerts(long activeAlerts) { this.activeAlerts = activeAlerts; }

    public long getConfirmedFraudAlerts() { return confirmedFraudAlerts; }
    public void setConfirmedFraudAlerts(long confirmedFraudAlerts) { this.confirmedFraudAlerts = confirmedFraudAlerts; }

    public long getFalsePositiveAlerts() { return falsePositiveAlerts; }
    public void setFalsePositiveAlerts(long falsePositiveAlerts) { this.falsePositiveAlerts = falsePositiveAlerts; }

    public long getEscalatedAlerts() { return escalatedAlerts; }
    public void setEscalatedAlerts(long escalatedAlerts) { this.escalatedAlerts = escalatedAlerts; }

    public double getAverageRiskScore() { return averageRiskScore; }
    public void setAverageRiskScore(double averageRiskScore) { this.averageRiskScore = averageRiskScore; }

    public double getFraudRatePercent() { return fraudRatePercent; }
    public void setFraudRatePercent(double fraudRatePercent) { this.fraudRatePercent = fraudRatePercent; }

    public Map<String, Long> getRiskDistribution() { return riskDistribution; }
    public void setRiskDistribution(Map<String, Long> riskDistribution) { this.riskDistribution = riskDistribution; }

    public java.util.List<Map<String, Object>> getRiskTrend() { return riskTrend; }
    public void setRiskTrend(java.util.List<Map<String, Object>> riskTrend) { this.riskTrend = riskTrend; }

    public java.util.List<Map<String, Object>> getTopRiskDrivers() { return topRiskDrivers; }
    public void setTopRiskDrivers(java.util.List<Map<String, Object>> topRiskDrivers) { this.topRiskDrivers = topRiskDrivers; }

    public Map<String, Object> getBatchInfo() { return batchInfo; }
    public void setBatchInfo(Map<String, Object> batchInfo) { this.batchInfo = batchInfo; }
}
