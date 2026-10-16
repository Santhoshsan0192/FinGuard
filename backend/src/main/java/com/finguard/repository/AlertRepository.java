package com.finguard.repository;

import com.finguard.model.Alert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends MongoRepository<Alert, String> {
    Optional<Alert> findByAlertId(String alertId);
    Optional<Alert> findByTransactionId(Long transactionId);
    List<Alert> findByCustomerId(String customerId);

    // Batch-scoped queries
    List<Alert> findByBatchId(String batchId);
    Page<Alert> findByBatchId(String batchId, Pageable pageable);
    Page<Alert> findByBatchIdAndRiskLevel(String batchId, String riskLevel, Pageable pageable);
    Page<Alert> findByBatchIdAndStatus(String batchId, String status, Pageable pageable);
    Page<Alert> findByBatchIdAndRiskLevelAndStatus(String batchId, String riskLevel, String status, Pageable pageable);

    long countByBatchId(String batchId);
    long countByBatchIdAndRiskLevel(String batchId, String riskLevel);
    long countByBatchIdAndStatus(String batchId, String status);

    // Global queries for backward compatibility
    long countByRiskLevel(String riskLevel);
    long countByStatus(String status);
    Page<Alert> findByRiskLevel(String riskLevel, Pageable pageable);
    Page<Alert> findByStatus(String status, Pageable pageable);
    Page<Alert> findByRiskLevelAndStatus(String riskLevel, String status, Pageable pageable);
}
