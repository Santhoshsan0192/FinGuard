package com.finguard.dto;

import java.time.Instant;

public class UserDto {
    private String userId;
    private String username;
    private String role;
    private Instant createdAt;
    private boolean isActive;

    public UserDto() {}

    public UserDto(String userId, String username, String role, Instant createdAt, boolean isActive) {
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.createdAt = createdAt;
        this.isActive = isActive;
    }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
