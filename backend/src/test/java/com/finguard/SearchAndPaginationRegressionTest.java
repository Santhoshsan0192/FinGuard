package com.finguard;

import com.finguard.model.User;
import com.finguard.repository.UserRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
@SuppressWarnings("null")
public class SearchAndPaginationRegressionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserRepository userRepository;

    private String analystToken;
    private static final String DEACTIVATED_TEST_USERNAME = "deactivated_audit_user";

    @BeforeEach
    public void setup() {
        analystToken = "Bearer " + tokenProvider.generateToken("analyst", List.of("ROLE_ANALYST"));
    }

    @AfterEach
    public void cleanup() {
        userRepository.findByUsername(DEACTIVATED_TEST_USERNAME).ifPresent(userRepository::delete);
    }

    // =========================================================================
    // 1. Customer Search Regex Tests
    // =========================================================================

    @Test
    public void testCustomerSearchWithOpenParenthesis() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("search", "("))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    public void testCustomerSearchWithOpenBracket() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("search", "["))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    public void testCustomerSearchWithBackslash() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("search", "\\"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
    }

    @Test
    public void testCustomerSearchWithWildcardDotStarDoesNotMatchAll() throws Exception {
        // ".*" must be treated as literal string, matching 0 customers, not all 120
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("search", ".*"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.totalElements", is(0)));
    }

    // =========================================================================
    // 2. Alert Search Regex Tests
    // =========================================================================

    @Test
    public void testAlertSearchWithRegexMetacharacters() throws Exception {
        for (String pattern : List.of("(", "[", "\\", ".*")) {
            mockMvc.perform(get("/api/alerts")
                            .header("Authorization", analystToken)
                            .param("search", pattern))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)));
        }
    }

    // =========================================================================
    // 3. Pagination Bounds Validation Tests
    // =========================================================================

    @Test
    public void testAlertsNegativePageClampedToZero() throws Exception {
        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", analystToken)
                        .param("page", "-1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number", is(0)))
                .andExpect(jsonPath("$.size", is(10)));
    }

    @Test
    public void testAlertsZeroSizeClampedToOne() throws Exception {
        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", analystToken)
                        .param("page", "0")
                        .param("size", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(1)))
                .andExpect(jsonPath("$.content", hasSize(lessThanOrEqualTo(1))));
    }

    @Test
    public void testAlertsExcessiveSizeClampedToHundred() throws Exception {
        mockMvc.perform(get("/api/alerts")
                        .header("Authorization", analystToken)
                        .param("page", "0")
                        .param("size", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(100)))
                .andExpect(jsonPath("$.content", hasSize(lessThanOrEqualTo(100))));
    }

    @Test
    public void testCustomersNegativePageClampedToZero() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("page", "-5")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page", is(0)))
                .andExpect(jsonPath("$.size", is(10)));
    }

    @Test
    public void testCustomersZeroSizeClampedToOne() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("page", "0")
                        .param("size", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(1)))
                .andExpect(jsonPath("$.content", hasSize(1)));
    }

    @Test
    public void testCustomersExcessiveSizeClampedToHundred() throws Exception {
        mockMvc.perform(get("/api/customers")
                        .header("Authorization", analystToken)
                        .param("page", "0")
                        .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size", is(100)))
                .andExpect(jsonPath("$.content", hasSize(lessThanOrEqualTo(100))));
    }

    // =========================================================================
    // 4. Deactivated User Token Invalidation Test
    // =========================================================================

    @Test
    public void testDeactivatedUserTokenIsRejected() throws Exception {
        // 1. Create active test user
        User user = new User("usr_deactivated_test", DEACTIVATED_TEST_USERNAME, "hashed_pw", "ROLE_ANALYST");
        user.setActive(true);
        userRepository.save(user);

        // 2. Issue valid token
        String token = "Bearer " + tokenProvider.generateToken(DEACTIVATED_TEST_USERNAME, List.of("ROLE_ANALYST"));

        // 3. Request succeeds while active
        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", token))
                .andExpect(status().isOk());

        // 4. Deactivate user in repository
        user.setActive(false);
        userRepository.save(user);

        // 5. Same token must now be rejected with 401 Unauthorized
        mockMvc.perform(get("/api/dashboard/summary")
                        .header("Authorization", token))
                .andExpect(status().isUnauthorized());
    }
}
