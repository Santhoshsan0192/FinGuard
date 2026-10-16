package com.finguard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FinGuard Decision Support Backend Application.
 * Strict batch-processing architecture: reads scored alerts and SHAP explainability
 * records directly from MongoDB.
 */
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class FinGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinGuardApplication.class, args);
    }
}
