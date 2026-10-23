package com.finguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.DashboardSummaryDto;
import com.finguard.model.*;
import com.finguard.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Phase 6 - Isolated FinGuard Shadow Integration Tests.
 *
 * Verifies end-to-end data contracts between the Python 397-feature Kaggle behavioural
 * scorer outputs, Spring Boot DTOs, and shadow REST endpoints without writing to MongoDB.
 */
@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
public class ShadowContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private String analystToken;

    @BeforeEach
    public void setUp() {
        analystToken = "Bearer " + tokenProvider.generateToken("analyst", List.of("ROLE_ANALYST"));
    }

    @Test
    @DisplayName("Contract 1: Batch document deserialization with 397-feature shadow metadata")
    public void testBatchDocumentDeserialization() throws Exception {
        String batchJson = """
        {
            "batch_id": "SHADOW-PHASE5-BATCH-0001",
            "model_version": "XGBoost-v3.0-behavioural-397",
            "dataset_version": "IEEE-CIS-Full",
            "calibration_method": "NONE_RAW_MIRROR",
            "is_calibrated": false,
            "calibration_note": "397-feature model operates on raw sigmoid probabilities; finguard_calibrator.joblib bypassed.",
            "started_at": "2026-03-15T12:00:00Z",
            "completed_at": "2026-03-15T12:00:08Z",
            "transaction_count": 1000,
            "fraud_count": 59,
            "high_risk_count": 39,
            "medium_risk_count": 105,
            "low_risk_count": 856,
            "risk_thresholds": {
                "low_threshold": 40.0,
                "high_threshold": 75.0
            },
            "processing_time_seconds": 8.15,
            "status": "COMPLETED",
            "global_feature_importance": [
                { "feature": "amount_deviation", "importance": 0.4281, "description": "Transaction Amount Deviation" },
                { "feature": "prior_card_count", "importance": 0.3812, "description": "Recorded Historical Activity Count" }
            ]
        }
        """;

        Batch batch = objectMapper.readValue(batchJson, Batch.class);
        assertNotNull(batch);
        assertEquals("SHADOW-PHASE5-BATCH-0001", batch.getBatchId());
        assertEquals("XGBoost-v3.0-behavioural-397", batch.getModelVersion());
        assertEquals("IEEE-CIS-Full", batch.getDatasetVersion());
        assertEquals("NONE_RAW_MIRROR", batch.getCalibrationMethod());
        assertFalse(batch.getIsCalibrated(), "is_calibrated must be explicitly false");
        assertEquals(1000, batch.getTransactionCount());
        assertEquals(39, batch.getHighRiskCount());
        assertEquals(105, batch.getMediumRiskCount());
        assertEquals(856, batch.getLowRiskCount());
        assertEquals(2, batch.getGlobalFeatureImportance().size());
    }

    @Test
    @DisplayName("Contract 2: Transaction document deserialization from IEEE-CIS raw features")
    public void testTransactionDocumentDeserialization() throws Exception {
        String txJson = """
        {
            "_id": "SHADOW-PHASE5-BATCH-0001_3459432",
            "transaction_id": 3459432,
            "batch_id": "SHADOW-PHASE5-BATCH-0001",
            "customer_id": "1234_567_visa_debit_102",
            "amount": 125.50,
            "product_cd": "W",
            "card4": "visa",
            "card6": "debit",
            "device_type": "desktop",
            "device_info": "Windows",
            "hour_of_day": 14,
            "day_of_week": 3,
            "TransactionDT": 12192900,
            "timestamp": "2026-03-15T14:00:00Z",
            "is_fraud_ground_truth": 0,
            "cold_start_customer_flag": 0,
            "created_at": "2026-03-15T12:00:00Z"
        }
        """;

        Transaction tx = objectMapper.readValue(txJson, Transaction.class);
        assertNotNull(tx);
        assertEquals(3459432L, tx.getTransactionId());
        assertEquals("SHADOW-PHASE5-BATCH-0001", tx.getBatchId());
        assertEquals("1234_567_visa_debit_102", tx.getCustomerId());
        assertEquals(125.50, tx.getAmount());
        assertEquals("visa", tx.getCard4());
        assertEquals(14, tx.getHourOfDay());
        assertEquals(0, tx.getColdStartCustomerFlag());
    }

    @Test
    @DisplayName("Contract 3: RiskScore document with raw probability mirror and explicit calibration metadata")
    public void testRiskScoreDocumentDeserialization() throws Exception {
        String scoreJson = """
        {
            "_id": "SHADOW-PHASE5-BATCH-0001_3459432",
            "transaction_id": 3459432,
            "batch_id": "SHADOW-PHASE5-BATCH-0001",
            "customer_id": "1234_567_visa_debit_102",
            "risk_score": 88.4,
            "risk_level": "HIGH",
            "raw_probability": 0.8842,
            "calibrated_probability": 0.8842,
            "calibration_method": "NONE_RAW_MIRROR",
            "is_calibrated": false,
            "calibration_note": "Uncalibrated raw sigmoid probability mirrored for Spring Boot DTO compatibility; no calibrator applied.",
            "model_version": "XGBoost-v3.0-behavioural-397",
            "scored_at": "2026-03-15T12:00:00Z"
        }
        """;

        RiskScore rs = objectMapper.readValue(scoreJson, RiskScore.class);
        assertNotNull(rs);
        assertEquals(3459432L, rs.getTransactionId());
        assertEquals(88.4, rs.getRiskScore());
        assertEquals("HIGH", rs.getRiskLevel());
        assertEquals(0.8842, rs.getRawProbability());
        assertEquals(0.8842, rs.getCalibratedProbability());
        assertEquals("NONE_RAW_MIRROR", rs.getCalibrationMethod());
        assertFalse(rs.getIsCalibrated(), "is_calibrated must be false; raw sigmoid is not genuine calibration");
    }

    @Test
    @DisplayName("Contract 4: Alert document with SHAP primary driver and cold start flag")
    public void testAlertDocumentDeserialization() throws Exception {
        String alertJson = """
        {
            "_id": "ALT_SHADOW-PHASE5-BATCH-0001_3459432",
            "alert_id": "ALT_SHADOW-PHASE5-BATCH-0001_3459432",
            "transaction_id": 3459432,
            "batch_id": "SHADOW-PHASE5-BATCH-0001",
            "customer_id": "1234_567_visa_debit_102",
            "customer_name": "Customer 1234_567_visa_d",
            "amount": 125.50,
            "risk_score": 88.4,
            "risk_level": "HIGH",
            "primary_risk_driver": "Transaction Amount Elevation",
            "cold_start_flag": 0,
            "status": "NEW",
            "timestamp": "2026-03-15T14:00:00Z",
            "created_at": "2026-03-15T12:00:00Z",
            "analyst_notes": ""
        }
        """;

        Alert alert = objectMapper.readValue(alertJson, Alert.class);
        assertNotNull(alert);
        assertEquals("ALT_SHADOW-PHASE5-BATCH-0001_3459432", alert.getAlertId());
        assertEquals(3459432L, alert.getTransactionId());
        assertEquals(88.4, alert.getRiskScore());
        assertEquals("HIGH", alert.getRiskLevel());
        assertEquals("Transaction Amount Elevation", alert.getPrimaryRiskDriver());
        assertEquals("NEW", alert.getStatus());
    }

    @Test
    @DisplayName("Contract 5: TreeSHAP Explanation with topFactors, positiveDrivers, and negativeDrivers")
    public void testExplanationDocumentDeserialization() throws Exception {
        String explJson = """
        {
            "_id": "SHADOW-PHASE5-BATCH-0001_3459432",
            "transaction_id": 3459432,
            "batch_id": "SHADOW-PHASE5-BATCH-0001",
            "customer_id": "1234_567_visa_debit_102",
            "base_value": -1.642,
            "top_factors": [
                {
                    "feature": "amount_deviation",
                    "value": 2.45,
                    "shap_value": 1.85,
                    "impact": "INCREASES_RISK",
                    "description": "Transaction amount deviates by +245.0% relative to card historical average"
                },
                {
                    "feature": "dist1",
                    "value": 4.0,
                    "shap_value": -0.72,
                    "impact": "DECREASES_RISK",
                    "description": "Geographic distance metric between billing address and postal code: 4 miles"
                }
            ],
            "positive_drivers": [
                {
                    "feature": "amount_deviation",
                    "value": 2.45,
                    "shap_value": 1.85,
                    "impact": "INCREASES_RISK",
                    "description": "Transaction amount deviates by +245.0% relative to card historical average"
                }
            ],
            "negative_drivers": [
                {
                    "feature": "dist1",
                    "value": 4.0,
                    "shap_value": -0.72,
                    "impact": "DECREASES_RISK",
                    "description": "Geographic distance metric between billing address and postal code: 4 miles"
                }
            ],
            "primary_risk_driver": "Transaction Amount Elevation",
            "generated_at": "2026-03-15T12:00:00Z"
        }
        """;

        Explanation exp = objectMapper.readValue(explJson, Explanation.class);
        assertNotNull(exp);
        assertEquals(3459432L, exp.getTransactionId());
        assertEquals(-1.642, exp.getBaseValue());
        assertEquals(2, exp.getTopFactors().size());
        assertEquals("Transaction Amount Elevation", exp.getPrimaryRiskDriver());

        TopFactor posFactor = exp.getTopFactors().get(0);
        assertEquals("amount_deviation", posFactor.getFeature());
        assertEquals(1.85, posFactor.getShapValue());
        assertEquals("INCREASES_RISK", posFactor.getImpact());

        TopFactor negFactor = exp.getTopFactors().get(1);
        assertEquals("dist1", negFactor.getFeature());
        assertEquals(-0.72, negFactor.getShapValue());
        assertEquals("DECREASES_RISK", negFactor.getImpact());
    }

    @Test
    @DisplayName("Shadow API: GET /api/shadow/status returns strictly isolated no-write metadata")
    public void testShadowStatusEndpoint() throws Exception {
        mockMvc.perform(get("/api/shadow/status")
                .header("Authorization", analystToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.environment", is("SHADOW_ISOLATED")))
                .andExpect(jsonPath("$.modelVersion", is("XGBoost-v3.0-behavioural-397")))
                .andExpect(jsonPath("$.datasetVersion", is("IEEE-CIS-Full")))
                .andExpect(jsonPath("$.featureCount", is(397)))
                .andExpect(jsonPath("$.databaseWritesEnabled", is(false)))
                .andExpect(jsonPath("$.calibrationMethod", is("NONE_RAW_MIRROR")))
                .andExpect(jsonPath("$.isCalibrated", is(false)))
                .andExpect(jsonPath("$.safetyStatus", is("STRICT_READ_ONLY_NO_WRITES")));
    }

    @Test
    @DisplayName("Shadow API: GET /api/shadow/summary returns Phase 5 1,000-batch metrics")
    public void testShadowSummaryEndpoint() throws Exception {
        mockMvc.perform(get("/api/shadow/summary")
                .header("Authorization", analystToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTransactionsScored", is(1000)))
                .andExpect(jsonPath("$.totalAlerts", is(144)))
                .andExpect(jsonPath("$.highRiskAlerts", is(39)))
                .andExpect(jsonPath("$.mediumRiskAlerts", is(105)))
                .andExpect(jsonPath("$.lowRiskAlerts", is(856)))
                .andExpect(jsonPath("$.batchInfo.modelVersion", is("XGBoost-v3.0-behavioural-397")))
                .andExpect(jsonPath("$.batchInfo.calibration_method", is("NONE_RAW_MIRROR")))
                .andExpect(jsonPath("$.batchInfo.is_calibrated", is(false)));
    }

    @Test
    @DisplayName("Shadow API: GET /api/shadow/risk-distribution matches 1,000-batch partition")
    public void testShadowRiskDistributionEndpoint() throws Exception {
        mockMvc.perform(get("/api/shadow/risk-distribution")
                .header("Authorization", analystToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].level", is("LOW")))
                .andExpect(jsonPath("$[0].count", is(856)))
                .andExpect(jsonPath("$[1].level", is("MEDIUM")))
                .andExpect(jsonPath("$[1].count", is(105)))
                .andExpect(jsonPath("$[2].level", is("HIGH")))
                .andExpect(jsonPath("$[2].count", is(39)));
    }

    @Test
    @DisplayName("Shadow API: GET /api/shadow/top-risk-drivers includes 397-feature TreeSHAP attributions")
    public void testShadowTopDriversEndpoint() throws Exception {
        mockMvc.perform(get("/api/shadow/top-risk-drivers")
                .header("Authorization", analystToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].feature", is("amount_deviation")))
                .andExpect(jsonPath("$[1].feature", is("prior_card_count")));
    }

    @Test
    @DisplayName("Shadow API: GET /api/shadow/transactions/{txId}/explanation returns TreeSHAP decomposition")
    public void testShadowExplanationEndpoint() throws Exception {
        mockMvc.perform(get("/api/shadow/transactions/3459432/explanation")
                .header("Authorization", analystToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(3459432)))
                .andExpect(jsonPath("$.topFactors", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.primaryRiskDriver", is("Transaction Amount Elevation")));
    }

    @Test
    @DisplayName("Security: Unauthenticated requests to /api/shadow/** are rejected with 401 Unauthorized")
    public void testShadowEndpointSecurityProtection() throws Exception {
        mockMvc.perform(get("/api/shadow/summary")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/shadow/alerts")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
