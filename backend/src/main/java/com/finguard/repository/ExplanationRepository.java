package com.finguard.repository;

import com.finguard.model.Explanation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExplanationRepository extends MongoRepository<Explanation, String> {
    Optional<Explanation> findByTransactionId(Long transactionId);
    Optional<Explanation> findFirstByTransactionIdOrderByGeneratedAtDesc(Long transactionId);
    Optional<Explanation> findByTransactionIdAndBatchId(Long transactionId, String batchId);
    List<Explanation> findByCustomerId(String customerId);
    Optional<Explanation> findFirstByCustomerIdOrderByGeneratedAtDesc(String customerId);
}
