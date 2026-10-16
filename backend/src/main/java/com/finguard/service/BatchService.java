package com.finguard.service;

import com.finguard.exception.ResourceNotFoundException;
import com.finguard.model.Batch;
import com.finguard.repository.BatchRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@SuppressWarnings("null")
public class BatchService {

    private final BatchRepository batchRepository;

    public BatchService(BatchRepository batchRepository) {
        this.batchRepository = batchRepository;
    }

    public List<Batch> getAllBatches() {
        return batchRepository.findAllByOrderByStartedAtDesc();
    }

    public Optional<Batch> getLatestBatch() {
        return batchRepository.findFirstByOrderByStartedAtDesc();
    }

    public Batch getBatchById(String batchId) {
        return batchRepository.findByBatchId(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchId));
    }

    public String resolveActiveBatchId(String requestedBatchId) {
        if (requestedBatchId != null && !requestedBatchId.isBlank()) {
            return requestedBatchId;
        }
        return getLatestBatch().map(Batch::getBatchId).orElse(null);
    }
}
