package com.tsoinyane.api.notification;

import com.tsoinyane.api.common.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;

@Value
@Builder
public class NotificationDto {
    Long id;
    String type;
    String icon;

    @NotBlank(message = "Title is required")
    @Size(max = 150, message = "Title must be 150 characters or fewer")
    String title;

    @NotBlank(message = "Message is required")
    @Size(max = 1000, message = "Message must be 1000 characters or fewer")
    String message;

    Instant timestamp;
    Instant scheduledAt;
    Instant expiresAt;
    Long schoolId;
    String schoolName;
    String senderName;
    String senderEmail;

    @NotEmpty(message = "At least one recipient role is required")
    List<Role> audienceRoles;

    Instant readAt;
    boolean read;
    boolean editable;
}
