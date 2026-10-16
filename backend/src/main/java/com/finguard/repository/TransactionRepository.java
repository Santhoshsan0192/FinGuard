package com.finguard.repository;

import com.finguard.model.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    Optional<Transaction> findByTransactionId(Long transactionId);
    List<Transaction> findByCustomerId(String customerId);
    List<Transaction> findTop20ByCustomerIdOrderByTransactionIdDesc(String customerId);
}
