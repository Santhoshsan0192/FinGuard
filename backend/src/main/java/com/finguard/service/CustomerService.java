package com.finguard.service;

import com.finguard.exception.ResourceNotFoundException;
import com.finguard.model.*;
import com.finguard.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;

import java.util.*;

@Service
@SuppressWarnings("null")
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final BehaviourProfileRepository profileRepository;
    private final TransactionRepository transactionRepository;
    private final ExplanationRepository explanationRepository;
    private final AlertRepository alertRepository;

    private final MongoTemplate mongoTemplate;

    public CustomerService(
            CustomerRepository customerRepository,
            BehaviourProfileRepository profileRepository,
            TransactionRepository transactionRepository,
            ExplanationRepository explanationRepository,
            AlertRepository alertRepository,
            MongoTemplate mongoTemplate) {
        this.customerRepository = customerRepository;
        this.profileRepository = profileRepository;
        this.transactionRepository = transactionRepository;
        this.explanationRepository = explanationRepository;
        this.alertRepository = alertRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public Map<String, Object> getAllCustomers(int page, int size, String search, String sortBy, String sortDirection) {
        int sanitizedPage = Math.max(0, page);
        int sanitizedSize = Math.max(1, Math.min(100, size));
        org.springframework.data.mongodb.core.query.Query query = new org.springframework.data.mongodb.core.query.Query();
        
        if (search != null && !search.trim().isEmpty()) {
            String s = java.util.regex.Pattern.quote(search.trim());
            org.springframework.data.mongodb.core.query.Criteria searchCriteria = new org.springframework.data.mongodb.core.query.Criteria().orOperator(
                    org.springframework.data.mongodb.core.query.Criteria.where("customer_id").regex(s, "i"),
                    org.springframework.data.mongodb.core.query.Criteria.where("full_name").regex(s, "i"),
                    org.springframework.data.mongodb.core.query.Criteria.where("name").regex(s, "i")
            );
            query.addCriteria(searchCriteria);
        }

        long totalElements = mongoTemplate.count(query, Customer.class);

        org.springframework.data.domain.Sort.Direction direction = "desc".equalsIgnoreCase(sortDirection) ? 
                org.springframework.data.domain.Sort.Direction.DESC : org.springframework.data.domain.Sort.Direction.ASC;
        String sortField = "name".equalsIgnoreCase(sortBy) || "full_name".equalsIgnoreCase(sortBy) ? "full_name" : "customer_id";

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(sanitizedPage, sanitizedSize, org.springframework.data.domain.Sort.by(direction, sortField));
        query.with(pageable);

        List<Customer> customers = mongoTemplate.find(query, Customer.class);
        int totalPages = (int) Math.ceil((double) totalElements / sanitizedSize);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", customers);
        response.put("page", sanitizedPage);
        response.put("size", sanitizedSize);
        response.put("totalElements", totalElements);
        response.put("totalPages", totalPages);
        
        return response;
    }

    public Customer getCustomer(String customerId) {
        return customerRepository.findByCustomerId(customerId)
                .or(() -> customerRepository.findById(customerId))
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
    }

    public BehaviourProfile getBaselineProfile(String customerId) {
        return profileRepository.findByCustomerId(customerId)
                .or(() -> profileRepository.findById(customerId))
                .orElse(null);
    }

    public List<Transaction> getCustomerTransactions(String customerId) {
        return transactionRepository.findTop20ByCustomerIdOrderByTransactionIdDesc(customerId);
    }

    public Explanation getCustomerExplanation(String customerId) {
        return explanationRepository.findFirstByCustomerIdOrderByGeneratedAtDesc(customerId)
                .orElse(null);
    }

    public Explanation getTransactionExplanation(Long transactionId) {
        if (transactionId == null) {
            return null;
        }
        return explanationRepository.findFirstByTransactionIdOrderByGeneratedAtDesc(transactionId)
                .orElse(null);
    }

    public Map<String, Object> getCustomerDetails(String customerId) {
        Customer customer = getCustomer(customerId);
        BehaviourProfile baseline = getBaselineProfile(customerId);
        List<Transaction> transactions = getCustomerTransactions(customerId);
        Explanation explanation = getCustomerExplanation(customerId);
        List<Alert> alerts = alertRepository.findByCustomerId(customerId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("customer", customer);
        response.put("baseline", baseline);
        response.put("transactions", transactions);
        response.put("latestExplanation", explanation);
        response.put("alerts", alerts);
        response.put("coldStart", baseline == null || baseline.getTotalTransactions() == null || baseline.getTotalTransactions() < 3);

        return response;
    }
}
