package com.tsoinyane.api.auth;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.common.Title;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresAt,
        UserProfile user
) {
    public record UserProfile(
            Long id,
            String email,
            String firstName,
            String lastName,
            Title title,
            Role role,
            List<Role> roles,
            Status status,
            List<Long> schoolIds
    ) {}
}
