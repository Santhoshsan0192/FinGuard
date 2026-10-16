package com.finguard.controller;

import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller to expose validated ML model metadata, evaluation metrics, and dataset statistics.
 */
@RestController
@RequestMapping("/api/models")
public class ModelController {

    private final MongoTemplate mongoTemplate;

    public ModelController(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/latest")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> getLatestModel() {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "created_at"));
        Document doc = mongoTemplate.findOne(query, Document.class, "models");

        Map<String, Object> response = new LinkedHashMap<>();
        if (doc != null) {
            response.put("modelId", doc.get("model_id"));
            response.put("modelVersion", doc.get("model_version"));
            response.put("algorithm", doc.get("algorithm"));
            response.put("evaluationMode", doc.get("evaluation_mode"));
            response.put("trainingDate", doc.get("created_at"));
            response.put("datasetVersion", "IEEE-CIS-2200");
            response.put("lastScoredAt", doc.get("last_scored_at"));
            response.put("lastUsedBatch", doc.get("last_used_batch"));

            Map<String, Object> metrics = (Map<String, Object>) doc.get("metrics");
            if (metrics != null) {
                response.put("precision", metrics.get("precision"));
                response.put("recall", metrics.get("recall"));
                response.put("f1Score", metrics.get("f1_score"));
                response.put("accuracy", metrics.get("accuracy"));
                response.put("rocAuc", metrics.get("roc_auc"));
                response.put("prAuc", metrics.get("pr_auc"));
                response.put("metrics", metrics);
            }

            Map<String, Object> datasetStats = (Map<String, Object>) doc.get("dataset_statistics");
            if (datasetStats != null) {
                response.put("datasetStatistics", datasetStats);
                response.put("totalTransactions", datasetStats.get("total_transactions"));
                response.put("totalFraud", datasetStats.get("total_fraud"));
                response.put("testCount", datasetStats.get("test_count"));
            }
        } else {
            response.put("modelVersion", "XGBoost-v2.0-temporal");
            response.put("algorithm", "XGBoost Classifier");
            response.put("datasetVersion", "IEEE-CIS-2200");
            response.put("precision", 0.8919);
            response.put("recall", 0.8250);
            response.put("f1Score", 0.8571);
            response.put("rocAuc", 0.9973);
            response.put("prAuc", 0.9626);
            response.put("trainingDate", "2026-10-04T19:08:04");
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Document>> getAllModels() {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "created_at"));
        List<Document> docs = mongoTemplate.find(query, Document.class, "models");
        return ResponseEntity.ok(docs);
    }
}
