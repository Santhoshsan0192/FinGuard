package com.finguard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Root controller to provide an API index and health status when navigating to http://localhost:8080/
 */
@RestController
@CrossOrigin(origins = "*")
public class RootController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> getApiIndex() {
        Map<String, Object> index = new HashMap<>();
        index.put("system", "FinGuard - Explainable AI Risk Scoring REST API");
        index.put("status", "UP_AND_RUNNING");
        index.put("architecture", "Batch Processing Decision Support (Offline XGBoost + SHAP -> MongoDB -> Spring Boot)");
        index.put("frontendUrl", "http://localhost:5173");
        index.put("availableEndpoints", List.of(
                "GET  /api/dashboard/summary       - High-level KPIs and risk distribution",
                "GET  /api/alerts                  - Filterable alerts queue",
                "GET  /api/alerts/{id}             - Individual alert details",
                "PUT  /api/alerts/{id}/status      - Analyst decision support update",
                "GET  /api/customers/{id}          - Customer profile & recent transactions",
                "GET  /api/customers/{id}/risk     - Customer baseline comparison & score",
                "GET  /api/customers/{id}/explanation - SHAP explainability factors"
        ));
        index.put("note", "Open http://localhost:5173 in your browser to view the React Analyst Dashboard.");
        return ResponseEntity.ok(index);
    }
}
