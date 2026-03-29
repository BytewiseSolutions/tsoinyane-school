package com.tsoinyane.api.security;

import com.tsoinyane.api.common.Role;

import java.util.List;

public record AuthenticatedUser(
        Long id,
        String email,
        List<Role> roles
) {
}
