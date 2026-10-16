package com.finguard.repository;

import com.finguard.model.RiskScore;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiskScoreRepository extends MongoRepository<RiskScore, String> {
    Optional<RiskScore> findByTransactionId(Long transactionId);
    List<RiskScore> findByCustomerId(String customerId);
    Optional<RiskScore> findFirstByCustomerIdOrderByScoredAtDesc(String customerId);

    long countByRiskLevel(String riskLevel);
    long countByBatchIdAndRiskLevel(String batchId, String riskLevel);
    List<RiskScore> findByBatchId(String batchId);
}
