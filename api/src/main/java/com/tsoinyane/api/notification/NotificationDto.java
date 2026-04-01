package com.tsoinyane.api.notification;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class NotificationDto {
    String type;
    String icon;
    String title;
    String message;
    Instant timestamp;
}
