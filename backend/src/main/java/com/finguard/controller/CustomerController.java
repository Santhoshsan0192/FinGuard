package com.finguard.controller;

import com.finguard.model.*;
import com.finguard.service.CustomerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for Customer risk profile and explainability lookups.
 * Follows strict Controller -> Service -> Repository architecture.
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    /**
     * Customer details including profile, baseline, recent transactions, and SHAP explanation.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getCustomer(@PathVariable String id) {
        return ResponseEntity.ok(customerService.getCustomerDetails(id));
    }

    /**
     * Backward-compatible alias for customer risk and baseline comparison.
     */
    @GetMapping("/{id}/risk")
    public ResponseEntity<Map<String, Object>> getCustomerRisk(@PathVariable String id) {
        return ResponseEntity.ok(customerService.getCustomerDetails(id));
    }

    /**
     * Dedicated endpoint for historical customer behaviour baseline profile.
     */
    @GetMapping("/{id}/baseline")
    public ResponseEntity<BehaviourProfile> getCustomerBaseline(@PathVariable String id) {
        BehaviourProfile profile = customerService.getBaselineProfile(id);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }

    /**
     * List recent transactions for a customer.
     */
    @GetMapping("/{id}/transactions")
    public ResponseEntity<List<Transaction>> getCustomerTransactions(@PathVariable String id) {
        return ResponseEntity.ok(customerService.getCustomerTransactions(id));
    }

    /**
     * SHAP feature explanation for customer or transaction-specific lookup.
     * When transactionId is provided, returns the explanation strictly for that transaction.
     */
    @GetMapping("/{id}/explanation")
    public ResponseEntity<Explanation> getCustomerExplanation(
            @PathVariable String id,
            @RequestParam(required = false) Long transactionId
    ) {
        Explanation explanation;
        if (transactionId != null) {
            explanation = customerService.getTransactionExplanation(transactionId);
        } else {
            explanation = customerService.getCustomerExplanation(id);
        }
        if (explanation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(explanation);
    }

    /**
     * List all customer entities with pagination, sorting, and search.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "customerId") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDirection) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.max(1, Math.min(100, size));
        return ResponseEntity.ok(customerService.getAllCustomers(sanitizedPage, sanitizedSize, search, sortBy, sortDirection));
    }
}
