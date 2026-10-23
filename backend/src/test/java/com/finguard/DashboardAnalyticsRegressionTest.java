package com.finguard;

import com.finguard.security.JwtTokenProvider;
import com.finguard.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
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

@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
public class DashboardAnalyticsRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private DashboardService dashboardService;

    private String analystToken;
    private static final String TARGET_BATCH_ID = "BATCH-2026-0003";

    @BeforeEach
    public void setup() {
        analystToken = "Bearer " + tokenProvider.generateToken("analyst", List.of("ROLE_ANALYST"));
    }

    @Test
    public void testRiskDistributionReconciliation() {
        Map<String, Object> summary = dashboardService.getSummary(TARGET_BATCH_ID);
        assertNotNull(summary);

        long totalTx = ((Number) summary.get("totalTransactionsScored")).longValue();
        long high = ((Number) summary.get("highRiskCount")).longValue();
        long med = ((Number) summary.get("mediumRiskCount")).longValue();
        long low = ((Number) summary.get("lowRiskCount")).longValue();

        assertEquals(2200L, totalTx, "Batch 3 must contain exactly 2,200 scored transactions");
        assertEquals(115L, high, "Batch 3 must contain 115 High Risk transactions");
        assertEquals(19L, med, "Batch 3 must contain 19 Medium Risk transactions");
        assertEquals(2066L, low, "Batch 3 must contain 2,066 Low Risk transactions");
        assertEquals(totalTx, high + med + low, "Low + Medium + High must reconcile exactly with total scored");
    }

    @Test
    public void testAverageRiskScoreCalculation() {
        double avgScore = dashboardService.getAverageRiskScore(TARGET_BATCH_ID);
        assertTrue(avgScore > 0.0 && avgScore <= 100.0, "Average risk score must be between 0 and 100");
        assertEquals(6.1, avgScore, 0.5, "Average risk score for Batch 3 should match persisted mean (6.1/100)");
    }

    @Test
    public void testRiskTrendBatchAggregationPointsContainCount() {
        Map<String, Object> batchTrend = dashboardService.getRiskTrend(TARGET_BATCH_ID, "batch");
        assertNotNull(batchTrend);
        assertEquals("batch", batchTrend.get("aggregationPeriod"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> points = (List<Map<String, Object>>) batchTrend.get("dataPoints");
        assertNotNull(points);
        assertFalse(points.isEmpty(), "Batch trend points must not be empty");

        for (Map<String, Object> pt : points) {
            assertTrue(pt.containsKey("timeLabel"), "Trend point must have timeLabel");
            assertTrue(pt.containsKey("count"), "Trend point must have 'count' property for Recharts Area");
            assertTrue(pt.containsKey("totalCount"), "Trend point must have 'totalCount' property");
            Number count = (Number) pt.get("count");
            assertNotNull(count);
            assertTrue(count.longValue() > 0, "Batch transaction volume count must be greater than zero");
        }
    }

    @Test
    public void testRiskTrendHourlyAndDailyModes() {
        Map<String, Object> hourlyTrend = dashboardService.getRiskTrend(TARGET_BATCH_ID, "hour");
        assertNotNull(hourlyTrend);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> hourPoints = (List<Map<String, Object>>) hourlyTrend.get("dataPoints");
        assertEquals(24, hourPoints.size(), "Hourly aggregation must return 24 hourly buckets");

        Map<String, Object> dailyTrend = dashboardService.getRiskTrend(TARGET_BATCH_ID, "day");
        assertNotNull(dailyTrend);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> dayPoints = (List<Map<String, Object>>) dailyTrend.get("dataPoints");
        assertEquals(7, dayPoints.size(), "Daily aggregation must return 7 day buckets");
    }

    @Test
    public void testTopRiskDriversEnrichmentAndUnits() {
        List<Map<String, Object>> drivers = dashboardService.getTopRiskDrivers(TARGET_BATCH_ID);
        assertNotNull(drivers);
        assertFalse(drivers.isEmpty(), "Top risk drivers must not be empty");

        for (Map<String, Object> d : drivers) {
            assertTrue(d.containsKey("feature"), "Driver must contain feature key");
            assertTrue(d.containsKey("importance"), "Driver must contain importance key");
            assertTrue(d.containsKey("description"), "Driver must contain human-readable description");

            String desc = (String) d.get("description");
            assertNotNull(desc, "Description cannot be null");
            assertFalse(desc.isBlank(), "Description cannot be blank");

            Number imp = (Number) d.get("importance");
            assertNotNull(imp, "Importance must be numeric");
            assertTrue(imp.doubleValue() >= 0.0, "TreeSHAP mean absolute log-odds magnitude must be non-negative");
        }
    }

    @Test
    public void testDashboardSummaryEndpointPayloadStructure() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary")
                .header("Authorization", analystToken)
                .param("batchId", TARGET_BATCH_ID)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTransactionsScored", is(2200)))
                .andExpect(jsonPath("$.totalAlerts", is(134)))
                .andExpect(jsonPath("$.highRiskAlerts", is(115)))
                .andExpect(jsonPath("$.mediumRiskAlerts", is(19)))
                .andExpect(jsonPath("$.lowRiskAlerts", is(0)))
                .andExpect(jsonPath("$.riskDistribution.LOW", is(2066)))
                .andExpect(jsonPath("$.riskDistribution.MEDIUM", is(19)))
                .andExpect(jsonPath("$.riskDistribution.HIGH", is(115)))
                .andExpect(jsonPath("$.batchInfo.batchId", is(TARGET_BATCH_ID)))
                .andExpect(jsonPath("$.batchInfo.transactionCount", is(2200)));
    }
}
