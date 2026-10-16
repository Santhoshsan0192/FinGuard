package com.finguard.controller;

import com.finguard.dto.UserDto;
import com.finguard.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller for User Management (Admin RBAC).
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<UserDto> updateUserRole(@PathVariable String id, @RequestBody Map<String, String> body) {
        String role = body.getOrDefault("role", "ROLE_ANALYST");
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDto> updateUserStatus(@PathVariable String id, @RequestBody Map<String, Object> body) {
        boolean isActive = Boolean.TRUE.equals(body.get("isActive")) || Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(userService.updateUserStatus(id, isActive));
    }
}
