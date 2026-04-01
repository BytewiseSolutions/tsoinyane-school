package com.tsoinyane.api.activitylog;

import lombok.Builder;

@Builder
public record ActivityLogWriteRequest(
        Long actorId,
        String actorName,
        String actorEmail,
        String action,
        String module,
        Long targetId,
        String description,
        String endpoint,
        String httpMethod,
        Integer statusCode,
        boolean success,
        String ipAddress,
        Long schoolId,
        String schoolName
) {
}
