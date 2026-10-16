package com.finguard.repository;

import com.finguard.model.Batch;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends MongoRepository<Batch, String> {
    Optional<Batch> findByBatchId(String batchId);
    List<Batch> findAllByOrderByStartedAtDesc();
    Optional<Batch> findFirstByOrderByStartedAtDesc();
}
