package com.tsoinyane.api.security;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class TokenService {

    private static final String HMAC_SHA256 = "HmacSHA256";

    private final byte[] secretKey;

    public TokenService(@Value("${app.security.jwt.secret:change-this-to-a-long-random-secret}") String secret) {
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    public String generateAccessToken(User user, long expiresAt) {
        String roles = user.getRoles().stream()
                .sorted(Comparator.naturalOrder())
                .map(Role::name)
                .reduce((left, right) -> left + "," + right)
                .orElse("");

        String payload = String.join("|",
                String.valueOf(user.getId()),
                user.getEmail(),
                String.valueOf(expiresAt),
                roles,
                UUID.randomUUID().toString()
        );

        String encodedPayload = encode(payload);
        String signature = encode(hmac(encodedPayload));
        return encodedPayload + "." + signature;
    }

    public AuthenticatedUser parseAccessToken(String token) {
        if (token == null || token.isBlank() || !token.contains(".")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String[] parts = token.split("\\.", 2);
        if (parts.length != 2) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String encodedPayload = parts[0];
        String providedSignature = parts[1];
        String expectedSignature = encode(hmac(encodedPayload));

        if (!MessageDigest.isEqual(
                providedSignature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        String payload = decode(encodedPayload);
        String[] values = payload.split("\\|", 5);
        if (values.length < 4) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        long expiresAt;
        Long userId;
        try {
            userId = Long.parseLong(values[0]);
            expiresAt = Long.parseLong(values[2]);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }

        if (System.currentTimeMillis() > expiresAt) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access token expired");
        }

        List<Role> roles = values[3].isBlank()
                ? List.of()
                : java.util.Arrays.stream(values[3].split(","))
                .filter(value -> !value.isBlank())
                .map(Role::valueOf)
                .toList();

        return new AuthenticatedUser(userId, values[1], roles);
    }

    private byte[] hmac(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secretKey, HMAC_SHA256));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign access token", ex);
        }
    }

    private String encode(String value) {
        return encode(value.getBytes(StandardCharsets.UTF_8));
    }

    private String encode(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private String decode(String value) {
        try {
            return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token");
        }
    }
}
