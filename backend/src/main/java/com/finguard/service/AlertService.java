package com.finguard.service;

import com.finguard.exception.InvalidRequestException;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.model.Alert;
import com.finguard.repository.AlertRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.*;
import java.time.Instant;
import com.finguard.model.AlertHistory;
import com.finguard.repository.AlertHistoryRepository;

@Service
@SuppressWarnings("null")
public class AlertService {

    private final AlertRepository alertRepository;
    private final MongoTemplate mongoTemplate;
    private final BatchService batchService;
    private final AlertHistoryRepository alertHistoryRepository;

    public AlertService(AlertRepository alertRepository, MongoTemplate mongoTemplate, BatchService batchService, AlertHistoryRepository alertHistoryRepository) {
        this.alertRepository = alertRepository;
        this.mongoTemplate = mongoTemplate;
        this.batchService = batchService;
        this.alertHistoryRepository = alertHistoryRepository;
    }

    public Map<String, Object> getAlerts(
            String batchId,
            String riskLevel,
            String status,
            String search,
            int page,
            int size,
            String sortBy,
            String sortDirection) {

        String activeBatch = batchService.resolveActiveBatchId(batchId);

        Query query = new Query();
        if (activeBatch != null) {
            query.addCriteria(Criteria.where("batch_id").is(activeBatch));
        }

        if (riskLevel != null && !riskLevel.equalsIgnoreCase("ALL")) {
            query.addCriteria(Criteria.where("risk_level").is(riskLevel.toUpperCase()));
        }

        if (status != null && !status.equalsIgnoreCase("ALL")) {
            if (status.equalsIgnoreCase("ACTIVE")) {
                query.addCriteria(Criteria.where("status").in("NEW", "UNDER_REVIEW"));
            } else {
                query.addCriteria(Criteria.where("status").is(status.toUpperCase()));
            }
        }

        if (search != null && !search.trim().isEmpty()) {
            String s = java.util.regex.Pattern.quote(search.trim());
            Criteria searchCriteria = new Criteria().orOperator(
                    Criteria.where("customer_id").regex(s, "i"),
                    Criteria.where("customer_name").regex(s, "i"),
                    Criteria.where("alert_id").regex(s, "i"),
                    Criteria.where("primary_risk_driver").regex(s, "i")
            );
            query.addCriteria(searchCriteria);
        }

        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.max(1, Math.min(100, size));

        long totalElements = mongoTemplate.count(query, Alert.class);

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = "riskScore".equalsIgnoreCase(sortBy) ? "risk_score"
                : "amount".equalsIgnoreCase(sortBy) ? "amount"
                : "createdAt".equalsIgnoreCase(sortBy) ? "created_at"
                : "risk_score";

        Pageable pageable = PageRequest.of(sanitizedPage, sanitizedSize, Sort.by(direction, sortField));
        query.with(pageable);

        List<Alert> alerts = mongoTemplate.find(query, Alert.class);
        int totalPages = (int) Math.ceil((double) totalElements / sanitizedSize);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", alerts);
        response.put("page", sanitizedPage);
        response.put("size", sanitizedSize);
        response.put("totalElements", totalElements);
        response.put("totalPages", totalPages);
        response.put("batchId", activeBatch);
        return response;
    }

    public Alert getAlertById(String id) {
        return alertRepository.findByAlertId(id)
                .or(() -> alertRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with identifier: " + id));
    }

    public Alert updateAlertStatus(String id, String newStatus, String notes, String analystUsername) {
        Alert alert = getAlertById(id);
        String previousStatus = alert.getStatus();

        if (newStatus != null && !newStatus.trim().isEmpty()) {
            String upper = newStatus.trim().toUpperCase();
            if ("DISMISSED".equals(upper)) {
                upper = "FALSE_POSITIVE";
            }
            if (!List.of("NEW", "UNDER_REVIEW", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "ESCALATED").contains(upper)) {
                throw new InvalidRequestException("Invalid alert status: " + newStatus);
            }
            alert.setStatus(upper);
        }

        if (notes != null) {
            alert.setAnalystNotes(notes);
        }
        
        Alert savedAlert = alertRepository.save(alert);
        
        // Record audit history
        AlertHistory history = new AlertHistory();
        history.setAlertId(savedAlert.getAlertId());
        history.setPreviousStatus(previousStatus);
        history.setNewStatus(savedAlert.getStatus());
        history.setAnalystNotes(notes);
        history.setAnalystUsername(analystUsername);
        history.setTimestamp(Instant.now().toString());
        alertHistoryRepository.save(history);

        return savedAlert;
    }

    public List<AlertHistory> getAlertHistory(String alertId) {
        Alert alert = alertRepository.findByAlertId(alertId)
                .or(() -> alertRepository.findById(alertId))
                .orElse(null);
        String resolvedId = alert != null ? alert.getAlertId() : alertId;
        return alertHistoryRepository.findByAlertIdOrderByTimestampDesc(resolvedId);
    }

    public Map<String, Object> getAlertStats(String batchId) {
        String activeBatch = batchService.resolveActiveBatchId(batchId);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("batchId", activeBatch);

        if (activeBatch != null) {
            stats.put("totalAlerts", alertRepository.countByBatchId(activeBatch));
            stats.put("highRiskCount", alertRepository.countByBatchIdAndRiskLevel(activeBatch, "HIGH"));
            stats.put("mediumRiskCount", alertRepository.countByBatchIdAndRiskLevel(activeBatch, "MEDIUM"));
            stats.put("lowRiskCount", alertRepository.countByBatchIdAndRiskLevel(activeBatch, "LOW"));

            Map<String, Long> statusCounts = new LinkedHashMap<>();
            for (String st : List.of("NEW", "UNDER_REVIEW", "CONFIRMED_FRAUD", "FALSE_POSITIVE", "ESCALATED")) {
                statusCounts.put(st, alertRepository.countByBatchIdAndStatus(activeBatch, st));
            }
            stats.put("statusCounts", statusCounts);
        } else {
            stats.put("totalAlerts", alertRepository.count());
            stats.put("highRiskCount", alertRepository.countByRiskLevel("HIGH"));
            stats.put("mediumRiskCount", alertRepository.countByRiskLevel("MEDIUM"));
            stats.put("lowRiskCount", alertRepository.countByRiskLevel("LOW"));
        }

        return stats;
    }
}
