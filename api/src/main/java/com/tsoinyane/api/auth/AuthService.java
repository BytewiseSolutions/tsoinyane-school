package com.tsoinyane.api.auth;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.security.TokenService;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final CurrentUserService currentUserService;

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
        long expirationMs = Boolean.TRUE.equals(request.rememberMe()) ? rememberMeExpirationMs : defaultExpirationMs;
        long expiresAt = now + expirationMs;

        String accessToken = tokenService.generateAccessToken(user, expiresAt);

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
                        user.getRoles().stream().sorted().findFirst().orElse(null),
                        user.getRoles().stream().sorted(Comparator.naturalOrder()).toList(),
                        user.getStatus(),
                        schoolIds
                )
        );
    }

    public String forgotPassword(ForgotPasswordRequest request) {
        return "If this email exists, reset instructions have been sent.";
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUserService.getCurrentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
