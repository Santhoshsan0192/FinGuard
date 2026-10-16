package com.finguard.controller;

import com.finguard.dto.DashboardSummaryDto;
import com.finguard.model.Batch;
import com.finguard.service.AlertService;

import com.finguard.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

/**
 * REST Controller for Fraud Analyst Dashboard summary, KPIs, and trends.
 * Delegates all business and data aggregation logic to DashboardService.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final AlertService alertService;


    public DashboardController(
            DashboardService dashboardService,
            AlertService alertService) {
        this.dashboardService = dashboardService;
        this.alertService = alertService;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> getSummary(@RequestParam(required = false) String batchId) {
        Map<String, Object> summaryData = dashboardService.getSummary(batchId);
        Map<String, Object> alertStats = alertService.getAlertStats(batchId);

        DashboardSummaryDto dto = new DashboardSummaryDto();
        dto.setTotalAlerts(((Number) alertStats.getOrDefault("totalAlerts", 0L)).longValue());
        dto.setHighRiskAlerts(((Number) alertStats.getOrDefault("highRiskCount", 0L)).longValue());
        dto.setMediumRiskAlerts(((Number) alertStats.getOrDefault("mediumRiskCount", 0L)).longValue());
        dto.setLowRiskAlerts(((Number) alertStats.getOrDefault("lowRiskCount", 0L)).longValue());

        @SuppressWarnings("unchecked")
        Map<String, Long> statusCounts = (Map<String, Long>) alertStats.get("statusCounts");
        if (statusCounts != null) {
            long newA = statusCounts.getOrDefault("NEW", 0L);
            long underReviewA = statusCounts.getOrDefault("UNDER_REVIEW", 0L);
            dto.setUnreviewedAlerts(newA);
            dto.setActiveAlerts(newA + underReviewA);
            dto.setConfirmedFraudAlerts(statusCounts.getOrDefault("CONFIRMED_FRAUD", 0L));
            dto.setFalsePositiveAlerts(statusCounts.getOrDefault("FALSE_POSITIVE", 0L));
            dto.setEscalatedAlerts(statusCounts.getOrDefault("ESCALATED", 0L));
        }

        long total = dto.getTotalAlerts();
        double fraudRate = total > 0 ? ((double) dto.getHighRiskAlerts() / total) * 100.0 : 5.8;
        dto.setFraudRatePercent(Math.round(fraudRate * 10.0) / 10.0);
        dto.setAverageRiskScore(dashboardService.getAverageRiskScore(batchId));

        dto.setTopRiskDrivers(dashboardService.getTopRiskDrivers(batchId));

        Map<String, Object> batchInfo = new LinkedHashMap<>();
        Batch activeBatch = (Batch) summaryData.get("activeBatch");
        if (activeBatch != null) {
            batchInfo.put("batchId", activeBatch.getBatchId());
            batchInfo.put("modelVersion", activeBatch.getModelVersion());
            batchInfo.put("datasetVersion", activeBatch.getDatasetVersion());
            batchInfo.put("processingTimeSeconds", activeBatch.getProcessingTimeSeconds());
            batchInfo.put("startedAt", activeBatch.getStartedAt());
            batchInfo.put("completedAt", activeBatch.getCompletedAt());
            batchInfo.put("lastRun", activeBatch.getCompletedAt() != null ? activeBatch.getCompletedAt() : activeBatch.getStartedAt());
            batchInfo.put("riskThresholds", activeBatch.getRiskThresholds());
        }
        dto.setBatchInfo(batchInfo);

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/risk-distribution")
    public ResponseEntity<List<Map<String, Object>>> getRiskDistribution(@RequestParam(required = false) String batchId) {
        return ResponseEntity.ok(dashboardService.getRiskDistribution(batchId));
    }

    @GetMapping("/risk-trend")
    public ResponseEntity<Map<String, Object>> getRiskTrend(
            @RequestParam(required = false) String batchId,
            @RequestParam(required = false, defaultValue = "hour") String aggregation) {
        return ResponseEntity.ok(dashboardService.getRiskTrend(batchId, aggregation));
    }

    @GetMapping("/top-risk-drivers")
    public ResponseEntity<List<Map<String, Object>>> getTopRiskDrivers(@RequestParam(required = false) String batchId) {
        return ResponseEntity.ok(dashboardService.getTopRiskDrivers(batchId));
    }
}
