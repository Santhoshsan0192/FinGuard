package com.finguard.controller;

import com.finguard.dto.DashboardSummaryDto;
import com.finguard.model.Alert;
import com.finguard.model.Explanation;
import com.finguard.service.ShadowService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for the isolated FinGuard Shadow Environment.
 *
 * Exposes read-only shadow endpoints under `/api/shadow/**` for validating
 * the 397-feature Kaggle behavioural model and dashboard display.
 *
 * Strictly isolated:
 * - Operates entirely through ShadowService without touching production database.
 * - Zero write endpoints.
 * - Requires standard ANALYST or ADMIN authentication.
 */
@RestController
@RequestMapping("/api/shadow")
public class ShadowController {

    private final ShadowService shadowService;

    public ShadowController(ShadowService shadowService) {
        this.shadowService = shadowService;
    }

    /**
     * Retrieves shadow evaluation summary metrics and batch metadata.
     */
    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> getShadowSummary() {
        return ResponseEntity.ok(shadowService.getShadowSummary());
    }

    /**
     * Retrieves shadow alerts queue with optional pagination and filters.
     */
    @GetMapping("/alerts")
    public ResponseEntity<Page<Alert>> getShadowAlerts(
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.max(1, Math.min(100, size));
        return ResponseEntity.ok(shadowService.getShadowAlerts(sanitizedPage, sanitizedSize, riskLevel, status));
    }

    /**
     * Retrieves a single shadow alert by ID.
     */
    @GetMapping("/alerts/{id}")
    public ResponseEntity<Alert> getShadowAlertById(@PathVariable String id) {
        return shadowService.getShadowAlertById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves shadow risk distribution breakdown.
     */
    @GetMapping("/risk-distribution")
    public ResponseEntity<List<Map<String, Object>>> getShadowRiskDistribution() {
        return ResponseEntity.ok(shadowService.getShadowRiskDistribution());
    }

    /**
     * Retrieves shadow 397-feature TreeSHAP top risk drivers.
     */
    @GetMapping("/top-risk-drivers")
    public ResponseEntity<List<Map<String, Object>>> getShadowTopRiskDrivers() {
        return ResponseEntity.ok(shadowService.getShadowTopDrivers());
    }

    /**
     * Retrieves TreeSHAP explanation for a shadow transaction.
     */
    @GetMapping("/transactions/{txId}/explanation")
    public ResponseEntity<Explanation> getShadowExplanation(@PathVariable Long txId) {
        return shadowService.getShadowExplanation(txId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieves status and safety verification metadata for the shadow environment.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getShadowStatus() {
        return ResponseEntity.ok(shadowService.getShadowStatus());
    }
}
