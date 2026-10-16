package com.finguard;

import com.finguard.model.Explanation;
import com.finguard.model.TopFactor;
import com.finguard.model.Transaction;
import com.finguard.repository.ExplanationRepository;
import com.finguard.repository.TransactionRepository;
import com.finguard.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Regression tests for transaction-to-explanation mapping.
 * Verifies that SHAP explanations are strictly tied to specific transaction IDs
 * and never fall back to another transaction belonging to the same customer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
public class TransactionExplanationRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private ExplanationRepository explanationRepository;

    private String analystToken;

    private static final String TEST_CUSTOMER_ID = "CUST_TEST_REGRESSION_SAME_CUST";
    private static final Long TX_NORMAL_ID = 8888001L;
    private static final Long TX_FRAUD_ID = 8888002L;
    private static final Long TX_NONEXISTENT_ID = 9999999L;

    @BeforeEach
    public void setup() {
        analystToken = "Bearer " + tokenProvider.generateToken("analyst", List.of("ROLE_ANALYST"));
        cleanup();

        // 1. Normal Transaction ($100, device desktop, hour 14)
        Transaction tx1 = new Transaction();
        tx1.setId("BATCH-TEST_" + TX_NORMAL_ID);
        tx1.setTransactionId(TX_NORMAL_ID);
        tx1.setCustomerId(TEST_CUSTOMER_ID);
        tx1.setAmount(100.0);
        tx1.setDeviceType("desktop");
        tx1.setHourOfDay(14);
        transactionRepository.save(tx1);

        // Explanation for Normal Transaction (all mitigating/negative SHAP values)
        Explanation exp1 = new Explanation();
        exp1.setId("EXP_" + TX_NORMAL_ID);
        exp1.setTransactionId(TX_NORMAL_ID);
        exp1.setCustomerId(TEST_CUSTOMER_ID);
        exp1.setBaseValue(-1.45);
        TopFactor factor1 = new TopFactor();
        factor1.setFeature("dist1");
        factor1.setValue(12.0);
        factor1.setShapValue(-1.25);
        factor1.setImpact("DECREASES_RISK");
        factor1.setDescription("Local proximity (12 miles)");
        exp1.setTopFactors(List.of(factor1));
        exp1.setGeneratedAt("2026-01-01T10:00:00Z");
        explanationRepository.save(exp1);

        // 2. High-Risk Fraud Transaction ($950, device mobile, hour 23) for SAME customer
        Transaction tx2 = new Transaction();
        tx2.setId("BATCH-TEST_" + TX_FRAUD_ID);
        tx2.setTransactionId(TX_FRAUD_ID);
        tx2.setCustomerId(TEST_CUSTOMER_ID);
        tx2.setAmount(950.0);
        tx2.setDeviceType("mobile");
        tx2.setHourOfDay(23);
        transactionRepository.save(tx2);

        // Explanation for Fraud Transaction (risk-increasing/positive SHAP values)
        Explanation exp2 = new Explanation();
        exp2.setId("EXP_" + TX_FRAUD_ID);
        exp2.setTransactionId(TX_FRAUD_ID);
        exp2.setCustomerId(TEST_CUSTOMER_ID);
        exp2.setBaseValue(-1.45);
        TopFactor factor2 = new TopFactor();
        factor2.setFeature("amt_to_baseline_ratio");
        factor2.setValue(5.8);
        factor2.setShapValue(2.45);
        factor2.setImpact("INCREASES_RISK");
        factor2.setDescription("Amount is 5.8x higher than baseline");
        exp2.setTopFactors(List.of(factor2));
        exp2.setGeneratedAt("2026-01-01T11:00:00Z");
        explanationRepository.save(exp2);
    }

    @AfterEach
    public void cleanup() {
        transactionRepository.findByTransactionId(TX_NORMAL_ID).ifPresent(transactionRepository::delete);
        transactionRepository.findByTransactionId(TX_FRAUD_ID).ifPresent(transactionRepository::delete);
        explanationRepository.findByTransactionId(TX_NORMAL_ID).ifPresent(explanationRepository::delete);
        explanationRepository.findByTransactionId(TX_FRAUD_ID).ifPresent(explanationRepository::delete);
    }

    @Test
    public void testNormalTransactionReturnsExactExplanation() throws Exception {
        mockMvc.perform(get("/api/transactions/" + TX_NORMAL_ID + "/explanation")
                        .header("Authorization", analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(TX_NORMAL_ID.intValue())))
                .andExpect(jsonPath("$.customerId", is(TEST_CUSTOMER_ID)))
                .andExpect(jsonPath("$.topFactors[0].feature", is("dist1")))
                .andExpect(jsonPath("$.topFactors[0].shap_value", is(-1.25)))
                .andExpect(jsonPath("$.topFactors[0].impact", is("DECREASES_RISK")));
    }

    @Test
    public void testFraudTransactionReturnsRiskIncreasingExplanationForSameCustomer() throws Exception {
        // Must return the specific fraud explanation for TX_FRAUD_ID, NOT TX_NORMAL_ID
        mockMvc.perform(get("/api/transactions/" + TX_FRAUD_ID + "/explanation")
                        .header("Authorization", analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(TX_FRAUD_ID.intValue())))
                .andExpect(jsonPath("$.customerId", is(TEST_CUSTOMER_ID)))
                .andExpect(jsonPath("$.topFactors[0].feature", is("amt_to_baseline_ratio")))
                .andExpect(jsonPath("$.topFactors[0].shap_value", is(2.45)))
                .andExpect(jsonPath("$.topFactors[0].impact", is("INCREASES_RISK")));
    }

    @Test
    public void testMissingExplanationReturnsNotFoundWithoutFallback() throws Exception {
        // When explanation does not exist for a transaction, must return 404
        // instead of falling back to another transaction by the same customer
        mockMvc.perform(get("/api/transactions/" + TX_NONEXISTENT_ID + "/explanation")
                        .header("Authorization", analystToken))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testCustomerEndpointWithTransactionIdParameter() throws Exception {
        // Tests GET /api/customers/{id}/explanation?transactionId={id}
        mockMvc.perform(get("/api/customers/" + TEST_CUSTOMER_ID + "/explanation")
                        .header("Authorization", analystToken)
                        .param("transactionId", TX_FRAUD_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(TX_FRAUD_ID.intValue())))
                .andExpect(jsonPath("$.topFactors[0].shap_value", is(2.45)));
    }

    @Test
    public void testCustomerEndpointWithNonexistentTransactionIdReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/customers/" + TEST_CUSTOMER_ID + "/explanation")
                        .header("Authorization", analystToken)
                        .param("transactionId", TX_NONEXISTENT_ID.toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testGetTransactionDetailsById() throws Exception {
        mockMvc.perform(get("/api/transactions/" + TX_FRAUD_ID)
                        .header("Authorization", analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(TX_FRAUD_ID.intValue())))
                .andExpect(jsonPath("$.amount", is(950.0)))
                .andExpect(jsonPath("$.deviceType", is("mobile")))
                .andExpect(jsonPath("$.hourOfDay", is(23)));
    }
}
