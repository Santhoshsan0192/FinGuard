package com.finguard.controller;

import com.finguard.security.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenProvider tokenProvider;
    private final com.finguard.service.UserService userService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final String adminPasswordHash;
    private final String analystPasswordHash;

    public AuthController(
            JwtTokenProvider tokenProvider,
            com.finguard.service.UserService userService,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            @org.springframework.beans.factory.annotation.Value("${finguard.security.admin.password-hash:$2a$10$0VSbDF/.w6dEPWaA9jw5GeZ1pkniEyBZ0cKdW6irDqyLjcXtH/2iW}") String adminPasswordHash, // Hash for admin123
            @org.springframework.beans.factory.annotation.Value("${finguard.security.analyst.password-hash:$2a$10$v2Fp5Xqil8ZRMj/0S2vDj.XacZ76kWdDbkN84qO2fRkp8Gqb7VQem}") String analystPasswordHash // Hash for analyst123
    ) {
        this.tokenProvider = tokenProvider;
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.adminPasswordHash = adminPasswordHash;
        this.analystPasswordHash = analystPasswordHash;
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        List<String> roles;
        String roleName;

        java.util.Optional<com.finguard.model.User> userOpt = userService.findByUsername(username);
        if (userOpt.isPresent()) {
            com.finguard.model.User u = userOpt.get();
            if (!u.isActive()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "Unauthorized");
                error.put("message", "User account is deactivated. Contact system administrator.");
                return ResponseEntity.status(401).body(error);
            }
            if (!passwordEncoder.matches(password, u.getPassword())) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("error", "Unauthorized");
                error.put("message", "Invalid username or password.");
                return ResponseEntity.status(401).body(error);
            }
            boolean isAdmin = u.getRole() != null && u.getRole().toUpperCase().contains("ADMIN");
            roles = isAdmin ? List.of("ADMIN", "ANALYST") : List.of("ANALYST");
            roleName = isAdmin ? "ADMIN" : "ANALYST";
            username = u.getUsername();
        } else if ("admin".equalsIgnoreCase(username) && passwordEncoder.matches(password, adminPasswordHash)) {
            roles = List.of("ADMIN", "ANALYST");
            roleName = "ADMIN";
        } else if ("analyst".equalsIgnoreCase(username) && passwordEncoder.matches(password, analystPasswordHash)) {
            roles = List.of("ANALYST");
            roleName = "ANALYST";
        } else {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", "Unauthorized");
            error.put("message", "Invalid username or password.");
            return ResponseEntity.status(401).body(error);
        }

        String token = tokenProvider.generateToken(username, roles);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("type", "Bearer");
        response.put("username", username);
        response.put("role", roleName);
        response.put("roles", roles);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/demo-token")
    public ResponseEntity<Map<String, Object>> getDemoToken(@RequestParam(defaultValue = "analyst") String role) {
        String username = "admin".equalsIgnoreCase(role) ? "admin" : "analyst";
        List<String> roles = "admin".equalsIgnoreCase(role) ? List.of("ADMIN", "ANALYST") : List.of("ANALYST");

        String token = tokenProvider.generateToken(username, roles);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("type", "Bearer");
        response.put("username", username);
        response.put("role", roles.get(0));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> response = new LinkedHashMap<>();

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            response.put("authenticated", true);
            response.put("username", auth.getName());
            response.put("authorities", auth.getAuthorities());
        } else {
            response.put("authenticated", false);
            response.put("username", "anonymous");
        }

        return ResponseEntity.ok(response);
    }
}
