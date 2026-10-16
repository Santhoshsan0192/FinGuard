package com.finguard.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;

/**
 * User entity for FinGuard RBAC authentication and management.
 */
@Document(collection = "users")
public class User {

    @Id
    private String userId;

    @Indexed(unique = true)
    private String username;

    private String password;

    private String role; // "ROLE_ANALYST" or "ROLE_ADMIN"

    @Field("created_at")
    private Instant createdAt = Instant.now();

    @Field("is_active")
    private boolean isActive = true;

    public User() {}

    public User(String userId, String username, String password, String role) {
        this.userId = userId;
        this.username = username;
        this.password = password;
        this.role = role;
        this.createdAt = Instant.now();
        this.isActive = true;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
