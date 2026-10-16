package com.finguard.controller;

import com.finguard.dto.AlertStatusUpdateRequest;
import com.finguard.model.Alert;
import com.finguard.service.AlertService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for managing fraud alerts queue and analyst decision actions.
 * Follows strict Controller -> Service -> Repository layer architecture.
 */
@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    /**
     * Retrieves alerts queue with optional batch, riskLevel, status, search, and pagination.
     */
    @GetMapping
    @SuppressWarnings({"unchecked", "null"})
    public ResponseEntity<Page<Alert>> getAlerts(
            @RequestParam(required = false) String batchId,
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "risk_score") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.max(1, Math.min(100, size));
        Map<String, Object> map = alertService.getAlerts(batchId, riskLevel, status, search, sanitizedPage, sanitizedSize, sortBy, direction);
        List<Alert> content = (List<Alert>) map.get("content");
        long total = (long) map.get("totalElements");
        Page<Alert> pageResult = new PageImpl<>(content, PageRequest.of(sanitizedPage, sanitizedSize), total);
        return ResponseEntity.ok(pageResult);
    }

    /**
     * Retrieves single alert by Alert ID or MongoDB document ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Alert> getAlertById(@PathVariable String id) {
        return ResponseEntity.ok(alertService.getAlertById(id));
    }

    /**
     * Retrieves audit history records for an alert ordered by timestamp descending.
     */
    @GetMapping("/{id}/history")
    public ResponseEntity<List<com.finguard.model.AlertHistory>> getAlertHistory(@PathVariable String id) {
        return ResponseEntity.ok(alertService.getAlertHistory(id));
    }

    /**
     * Allows fraud analysts to transition alert status (NEW, UNDER_REVIEW, CONFIRMED_FRAUD, DISMISSED)
     * and attach decision support notes.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Alert> updateAlertStatus(
            @PathVariable String id,
            @RequestBody AlertStatusUpdateRequest request,
            org.springframework.security.core.Authentication authentication
    ) {
        String username = authentication != null ? authentication.getName() : "system";
        Alert updated = alertService.updateAlertStatus(id, request.getStatus(), request.getAnalystNotes(), username);
        return ResponseEntity.ok(updated);
    }

    /**
     * Summary statistics for analyst dashboard queue indicators.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAlertStats(@RequestParam(required = false) String batchId) {
        return ResponseEntity.ok(alertService.getAlertStats(batchId));
    }
}
