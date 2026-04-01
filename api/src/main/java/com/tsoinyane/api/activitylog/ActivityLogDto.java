package com.tsoinyane.api.activitylog;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;

@Value
@Builder
public class ActivityLogDto {
    Long id;
    Instant createdAt;
    Long actorId;
    String actorName;
    String actorEmail;
    String action;
    String module;
    Long targetId;
    String description;
    String endpoint;
    String httpMethod;
    Integer statusCode;
    boolean success;
    String ipAddress;
    Long schoolId;
    String schoolName;
}
