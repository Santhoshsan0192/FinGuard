package com.finguard.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility helper to generate BCrypt password hashes for administrative and analyst test users.
 */
public class HashGen {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("admin123: " + encoder.encode("admin123"));
        System.out.println("analyst123: " + encoder.encode("analyst123"));
    }
}
