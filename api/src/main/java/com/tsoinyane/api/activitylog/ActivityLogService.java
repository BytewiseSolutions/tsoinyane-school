package com.tsoinyane.api.activitylog;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private static final int MAX_LOGS = 500;

    private final ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public List<ActivityLogDto> getLogs(Long schoolId) {
        return activityLogRepository.findRecent(schoolId).stream()
                .limit(MAX_LOGS)
                .map(this::toDto)
                .toList();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(ActivityLogWriteRequest request) {
        activityLogRepository.save(ActivityLog.builder()
                .actorId(request.actorId())
                .actorName(request.actorName())
                .actorEmail(request.actorEmail())
                .action(request.action())
                .module(request.module())
                .targetId(request.targetId())
                .description(request.description())
                .endpoint(request.endpoint())
                .httpMethod(request.httpMethod())
                .statusCode(request.statusCode())
                .success(request.success())
                .ipAddress(request.ipAddress())
                .schoolId(request.schoolId())
                .schoolName(request.schoolName())
                .build());
    }

    private ActivityLogDto toDto(ActivityLog log) {
        return ActivityLogDto.builder()
                .id(log.getId())
                .createdAt(log.getCreatedAt())
                .actorId(log.getActorId())
                .actorName(log.getActorName())
                .actorEmail(log.getActorEmail())
                .action(log.getAction())
                .module(log.getModule())
                .targetId(log.getTargetId())
                .description(log.getDescription())
                .endpoint(log.getEndpoint())
                .httpMethod(log.getHttpMethod())
                .statusCode(log.getStatusCode())
                .success(log.isSuccess())
                .ipAddress(log.getIpAddress())
                .schoolId(log.getSchoolId())
                .schoolName(log.getSchoolName())
                .build();
    }
}
