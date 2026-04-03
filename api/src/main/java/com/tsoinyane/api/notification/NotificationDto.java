package com.tsoinyane.api.notification;

import com.tsoinyane.api.common.Role;
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
    String title;
    String message;
    Instant timestamp;
    Instant scheduledAt;
    Instant expiresAt;
    Long schoolId;
    String schoolName;
    String senderName;
    String senderEmail;
    List<Role> audienceRoles;
    Instant readAt;
    Boolean read;
    Boolean editable;
}
