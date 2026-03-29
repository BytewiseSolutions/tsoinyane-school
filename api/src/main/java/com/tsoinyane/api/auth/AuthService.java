package com.tsoinyane.api.auth;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.server.ResponseStatusException;

import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;
    @Value("${app.security.jwt.expiration-ms:86400000}")
    private long defaultExpirationMs;
    @Value("${app.security.jwt.refresh-expiration-ms:604800000}")
    private long rememberMeExpirationMs;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (user.getStatus() != Status.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is not active");
        }

        List<Long> schoolIds = schoolRepository.findAllByUsers_Id(user.getId()).stream()
                .map(School::getId)
                .toList();

        long now = System.currentTimeMillis();
        long expirationMs = request.rememberMe() ? rememberMeExpirationMs : defaultExpirationMs;
        long expiresAt = now + expirationMs;

        String rawToken = user.getId() + ":" + user.getEmail() + ":" + expiresAt + ":" + UUID.randomUUID();
        String accessToken = Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes());

        return new LoginResponse(
                accessToken,
                "Bearer",
                expiresAt,
                new LoginResponse.UserProfile(
                        user.getId(),
                        user.getEmail(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getTitle(),
                        user.getRole(),
                        user.getStatus(),
                        schoolIds
                )
        );
    }

    public String forgotPassword(ForgotPasswordRequest request) {
        return "If this email exists, reset instructions have been sent.";
    }
}
