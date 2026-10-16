package com.finguard.service;

import com.finguard.dto.UserDto;
import com.finguard.exception.InvalidRequestException;
import com.finguard.exception.ResourceNotFoundException;
import com.finguard.model.User;
import com.finguard.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@SuppressWarnings("null")
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminPasswordHash;
    private final String analystPasswordHash;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${finguard.security.admin.password-hash:$2a$10$0VSbDF/.w6dEPWaA9jw5GeZ1pkniEyBZ0cKdW6irDqyLjcXtH/2iW}") String adminPasswordHash,
            @Value("${finguard.security.analyst.password-hash:$2a$10$v2Fp5Xqil8ZRMj/0S2vDj.XacZ76kWdDbkN84qO2fRkp8Gqb7VQem}") String analystPasswordHash
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminPasswordHash = adminPasswordHash;
        this.analystPasswordHash = analystPasswordHash;
    }

    @PostConstruct
    public void initDefaultUsers() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User("USR_ADMIN", "admin", adminPasswordHash, "ROLE_ADMIN");
            userRepository.save(admin);
        }
        if (!userRepository.existsByUsername("analyst")) {
            User analyst = new User("USR_ANALYST", "analyst", analystPasswordHash, "ROLE_ANALYST");
            userRepository.save(analyst);
        }
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> new UserDto(u.getUserId(), u.getUsername(), u.getRole(), u.getCreatedAt(), u.isActive()))
                .collect(Collectors.toList());
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsernameIgnoreCase(username);
    }

    public UserDto updateUserRole(String userId, String newRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        String normalizedRole = newRole.toUpperCase();
        if (!normalizedRole.startsWith("ROLE_")) {
            normalizedRole = "ROLE_" + normalizedRole;
        }

        if (!List.of("ROLE_ADMIN", "ROLE_ANALYST").contains(normalizedRole)) {
            throw new InvalidRequestException("Invalid role: " + newRole);
        }

        user.setRole(normalizedRole);
        User saved = userRepository.save(user);
        return new UserDto(saved.getUserId(), saved.getUsername(), saved.getRole(), saved.getCreatedAt(), saved.isActive());
    }

    public UserDto updateUserStatus(String userId, boolean isActive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        user.setActive(isActive);
        User saved = userRepository.save(user);
        return new UserDto(saved.getUserId(), saved.getUsername(), saved.getRole(), saved.getCreatedAt(), saved.isActive());
    }

    public User createUser(String username, String rawPassword, String role) {
        if (userRepository.existsByUsername(username)) {
            throw new InvalidRequestException("Username already exists: " + username);
        }

        String normalizedRole = role.toUpperCase();
        if (!normalizedRole.startsWith("ROLE_")) {
            normalizedRole = "ROLE_" + normalizedRole;
        }

        User user = new User(
                "USR_" + System.currentTimeMillis(),
                username,
                passwordEncoder.encode(rawPassword),
                normalizedRole
        );
        return userRepository.save(user);
    }
}
