package com.finguard.controller;

import com.finguard.model.Explanation;
import com.finguard.model.Transaction;
import com.finguard.repository.ExplanationRepository;
import com.finguard.repository.TransactionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Transaction details and SHAP explanation lookups.
 * Enables exact 1-to-1 mapping between a flagged alert transaction and its TreeSHAP attribution.
 */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final ExplanationRepository explanationRepository;

    public TransactionController(TransactionRepository transactionRepository, ExplanationRepository explanationRepository) {
        this.transactionRepository = transactionRepository;
        this.explanationRepository = explanationRepository;
    }

    /**
     * Retrieve transaction entity by numeric transaction ID.
     */
    @GetMapping("/{transactionId}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable Long transactionId) {
        return transactionRepository.findByTransactionId(transactionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieve transaction-specific SHAP explanation.
     * Guaranteed to match the exact transaction, without falling back to other customer transactions.
     */
    @GetMapping("/{transactionId}/explanation")
    public ResponseEntity<Explanation> getTransactionExplanation(
            @PathVariable Long transactionId,
            @RequestParam(required = false) String batchId
    ) {
        java.util.Optional<Explanation> explanation;
        if (batchId != null && !batchId.isBlank()) {
            explanation = explanationRepository.findByTransactionIdAndBatchId(transactionId, batchId);
            if (explanation.isEmpty()) {
                explanation = explanationRepository.findFirstByTransactionIdOrderByGeneratedAtDesc(transactionId);
            }
        } else {
            explanation = explanationRepository.findFirstByTransactionIdOrderByGeneratedAtDesc(transactionId);
        }
        return explanation.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
