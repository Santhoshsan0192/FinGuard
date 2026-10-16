package com.finguard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finguard.dto.AlertStatusUpdateRequest;
import com.finguard.model.Alert;
import com.finguard.model.AlertHistory;
import com.finguard.model.Explanation;
import com.finguard.model.TopFactor;
import com.finguard.repository.AlertHistoryRepository;
import com.finguard.repository.AlertRepository;
import com.finguard.repository.ExplanationRepository;
import com.finguard.security.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Regression tests for Phase 3:
 * Unified Decision Workflow and Investigator Audit-Notes Polish.
 */
@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
public class AlertDecisionWorkflowRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AlertHistoryRepository alertHistoryRepository;

    @Autowired
    private ExplanationRepository explanationRepository;

    private String analystToken;

    private static final String TEST_ALERT_ID = "ALT_TEST_PHASE3_WORKFLOW_9001";
    private static final Long TEST_TX_ID = 7777001L;
    private static final String TEST_CUSTOMER_ID = "CUST_PHASE3_TEST";

    @BeforeEach
    public void setup() {
        analystToken = "Bearer " + tokenProvider.generateToken("analyst", List.of("ROLE_ANALYST"));
        cleanup();

        // Seed test alert
        Alert alert = new Alert();
        alert.setId(TEST_ALERT_ID);
        alert.setAlertId(TEST_ALERT_ID);
        alert.setTransactionId(TEST_TX_ID);
        alert.setBatchId("BATCH-PHASE3-TEST");
        alert.setCustomerId(TEST_CUSTOMER_ID);
        alert.setCustomerName("Phase 3 Customer");
        alert.setAmount(640.50);
        alert.setRiskScore(92.4);
        alert.setRiskLevel("HIGH");
        alert.setPrimaryRiskDriver("Rapid Velocity");
        alert.setStatus("NEW");
        alert.setCreatedAt("2026-01-01T10:00:00Z");
        alertRepository.save(alert);

        // Seed corresponding transaction SHAP explanation
        Explanation exp = new Explanation();
        exp.setId("EXP_PHASE3_" + TEST_TX_ID);
        exp.setTransactionId(TEST_TX_ID);
        exp.setCustomerId(TEST_CUSTOMER_ID);
        exp.setBaseValue(-1.42);
        TopFactor factor = new TopFactor();
        factor.setFeature("velocity_rapid_tx_flag");
        factor.setValue(1.0);
        factor.setShapValue(2.15);
        factor.setImpact("INCREASES_RISK");
        factor.setDescription("High transaction burst frequency");
        exp.setTopFactors(List.of(factor));
        exp.setGeneratedAt("2026-01-01T10:00:00Z");
        explanationRepository.save(exp);
    }

    @AfterEach
    public void cleanup() {
        alertRepository.findByAlertId(TEST_ALERT_ID).ifPresent(alertRepository::delete);
        alertRepository.findById(TEST_ALERT_ID).ifPresent(alertRepository::delete);
        alertHistoryRepository.deleteByAlertId(TEST_ALERT_ID);
        explanationRepository.findFirstByTransactionIdOrderByGeneratedAtDesc(TEST_TX_ID)
                .ifPresent(explanationRepository::delete);
    }

    @Test
    public void testEachSupportedDecisionProducesIntendedStatusTransition() throws Exception {
        // 1. Transition: NEW -> UNDER_REVIEW
        AlertStatusUpdateRequest req1 = new AlertStatusUpdateRequest("UNDER_REVIEW", "Beginning review of IP velocity");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_REVIEW")))
                .andExpect(jsonPath("$.analystNotes", is("Beginning review of IP velocity")));

        // 2. Transition: UNDER_REVIEW -> CONFIRMED_FRAUD
        AlertStatusUpdateRequest req2 = new AlertStatusUpdateRequest("CONFIRMED_FRAUD", "Device fingerprint confirmed malicious");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CONFIRMED_FRAUD")))
                .andExpect(jsonPath("$.analystNotes", is("Device fingerprint confirmed malicious")));

        // 3. Transition: CONFIRMED_FRAUD -> FALSE_POSITIVE
        AlertStatusUpdateRequest req3 = new AlertStatusUpdateRequest("FALSE_POSITIVE", "Customer verified legitimate authorization");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("FALSE_POSITIVE")));

        // 4. Transition: FALSE_POSITIVE -> ESCALATED
        AlertStatusUpdateRequest req4 = new AlertStatusUpdateRequest("ESCALATED", "Escalating to fraud intelligence unit");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req4)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ESCALATED")));
    }

    @Test
    public void testUniqueNotePersistsInAlertDocumentAndAlertHistory() throws Exception {
        String uniqueNote = "PHASE3_UNIQUE_NOTE_" + UUID.randomUUID();

        AlertStatusUpdateRequest req = new AlertStatusUpdateRequest("CONFIRMED_FRAUD", uniqueNote);
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CONFIRMED_FRAUD")))
                .andExpect(jsonPath("$.analystNotes", is(uniqueNote)));

        // Direct DB verification: Alert collection
        Alert alertInDb = alertRepository.findByAlertId(TEST_ALERT_ID).orElseThrow();
        assertEquals("CONFIRMED_FRAUD", alertInDb.getStatus());
        assertEquals(uniqueNote, alertInDb.getAnalystNotes());

        // Direct DB verification: alert_history collection
        List<AlertHistory> histories = alertHistoryRepository.findByAlertIdOrderByTimestampDesc(TEST_ALERT_ID);
        assertFalse(histories.isEmpty());
        AlertHistory latest = histories.get(0);
        assertEquals(TEST_ALERT_ID, latest.getAlertId());
        assertEquals("NEW", latest.getPreviousStatus());
        assertEquals("CONFIRMED_FRAUD", latest.getNewStatus());
        assertEquals("analyst", latest.getAnalystUsername());
        assertEquals(uniqueNote, latest.getAnalystNotes());
        assertNotNull(latest.getTimestamp());
    }

    @Test
    public void testAuditHistoryEndpointReturnsCompleteAuditTrail() throws Exception {
        // Step 1: Note 1
        AlertStatusUpdateRequest req1 = new AlertStatusUpdateRequest("UNDER_REVIEW", "First step: contacting customer");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isOk());

        // Step 2: Note 2
        AlertStatusUpdateRequest req2 = new AlertStatusUpdateRequest("CONFIRMED_FRAUD", "Second step: customer confirmed card stolen");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2)))
                .andExpect(status().isOk());

        // Retrieve audit history via GET /api/alerts/{id}/history
        mockMvc.perform(get("/api/alerts/" + TEST_ALERT_ID + "/history")
                        .header("Authorization", analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].previousStatus", is("UNDER_REVIEW")))
                .andExpect(jsonPath("$[0].newStatus", is("CONFIRMED_FRAUD")))
                .andExpect(jsonPath("$[0].analystUsername", is("analyst")))
                .andExpect(jsonPath("$[0].analystNotes", is("Second step: customer confirmed card stolen")))
                .andExpect(jsonPath("$[0].timestamp", notNullValue()))
                .andExpect(jsonPath("$[1].previousStatus", is("NEW")))
                .andExpect(jsonPath("$[1].newStatus", is("UNDER_REVIEW")))
                .andExpect(jsonPath("$[1].analystNotes", is("First step: contacting customer")));
    }

    @Test
    public void testFailedRequestsReturnErrorAndDoNotModifyState() throws Exception {
        // Invalid status should return 400
        AlertStatusUpdateRequest invalidReq = new AlertStatusUpdateRequest("UNAUTHORIZED_STATUS_CODE", "Some note");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest());

        // Verify alert document remained unchanged
        Alert alertInDb = alertRepository.findByAlertId(TEST_ALERT_ID).orElseThrow();
        assertEquals("NEW", alertInDb.getStatus());

        // Non-existent alert returns 404
        mockMvc.perform(patch("/api/alerts/ALT_NONEXISTENT_ALERT_999999/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AlertStatusUpdateRequest("CONFIRMED_FRAUD", "Note"))))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testTransactionSpecificShapExplanationRemainsIntactAfterAlertUpdate() throws Exception {
        // 1. Update alert
        AlertStatusUpdateRequest req = new AlertStatusUpdateRequest("CONFIRMED_FRAUD", "Finalized fraud confirmation");
        mockMvc.perform(patch("/api/alerts/" + TEST_ALERT_ID + "/status")
                        .header("Authorization", analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // 2. Query transaction explanation
        mockMvc.perform(get("/api/transactions/" + TEST_TX_ID + "/explanation")
                        .header("Authorization", analystToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId", is(TEST_TX_ID.intValue())))
                .andExpect(jsonPath("$.customerId", is(TEST_CUSTOMER_ID)))
                .andExpect(jsonPath("$.baseValue", is(-1.42)))
                .andExpect(jsonPath("$.topFactors[0].feature", is("velocity_rapid_tx_flag")))
                .andExpect(jsonPath("$.topFactors[0].shap_value", is(2.15)))
                .andExpect(jsonPath("$.topFactors[0].impact", is("INCREASES_RISK")));
    }
}
