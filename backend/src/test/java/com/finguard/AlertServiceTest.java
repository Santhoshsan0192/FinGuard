package com.finguard;

import com.finguard.exception.InvalidRequestException;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.model.Alert;
import com.finguard.model.AlertHistory;
import com.finguard.repository.AlertRepository;
import com.finguard.repository.AlertHistoryRepository;
import com.finguard.service.AlertService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AlertServiceTest {

    @Autowired
    private AlertService alertService;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AlertHistoryRepository alertHistoryRepository;

    private static final String TEST_ALERT_ID = "ALT_TEST_UNIQUE_1001";

    @BeforeEach
    public void setup() {
        // Clean up previous test alert
        alertRepository.findByAlertId(TEST_ALERT_ID).ifPresent(alertRepository::delete);
        alertRepository.findById(TEST_ALERT_ID).ifPresent(alertRepository::delete);
        
        alertHistoryRepository.deleteByAlertId(TEST_ALERT_ID);

        Alert alert = new Alert();
        alert.setId(TEST_ALERT_ID);
        alert.setAlertId(TEST_ALERT_ID);
        alert.setTransactionId(9999001L);
        alert.setBatchId("BATCH-2026-TEST");
        alert.setCustomerId("CUST_TEST_001");
        alert.setCustomerName("Test Customer");
        alert.setAmount(150.0);
        alert.setRiskScore(85.5);
        alert.setRiskLevel("HIGH");
        alert.setPrimaryRiskDriver("Amount Deviation");
        alert.setStatus("NEW");
        alert.setCreatedAt("2026-01-01T12:00:00Z");

        alertRepository.save(alert);
    }

    @Test
    public void testGetAlertById() {
        Alert alert = alertService.getAlertById(TEST_ALERT_ID);
        assertNotNull(alert);
        assertEquals("HIGH", alert.getRiskLevel());
        assertEquals("NEW", alert.getStatus());
    }

    @Test
    public void testUpdateAlertStatusConfirmedFraudAndAuditTrail() {
        Alert updated = alertService.updateAlertStatus(TEST_ALERT_ID, "CONFIRMED_FRAUD", "Verified unauthorized card usage", "test_analyst");
        assertEquals("CONFIRMED_FRAUD", updated.getStatus());
        assertEquals("Verified unauthorized card usage", updated.getAnalystNotes());
        
        List<AlertHistory> histories = alertHistoryRepository.findByAlertIdOrderByTimestampDesc(TEST_ALERT_ID);
        assertFalse(histories.isEmpty());
        AlertHistory latest = histories.get(0);
        assertEquals("NEW", latest.getPreviousStatus());
        assertEquals("CONFIRMED_FRAUD", latest.getNewStatus());
        assertEquals("test_analyst", latest.getAnalystUsername());
        assertEquals("Verified unauthorized card usage", latest.getAnalystNotes());
    }

    @Test
    public void testUpdateAlertStatusFalsePositive() {
        Alert updated = alertService.updateAlertStatus(TEST_ALERT_ID, "FALSE_POSITIVE", "Customer confirmed valid travel purchase", "test_analyst");
        assertEquals("FALSE_POSITIVE", updated.getStatus());
    }

    @Test
    public void testInvalidStatusThrowsException() {
        assertThrows(InvalidRequestException.class, () -> {
            alertService.updateAlertStatus(TEST_ALERT_ID, "INVALID_STATE", "Note", "system");
        });
    }

    @Test
    public void testNonExistentAlertThrowsException() {
        assertThrows(ResourceNotFoundException.class, () -> {
            alertService.getAlertById("NON_EXISTENT_ALERT_99999");
        });
    }
}
