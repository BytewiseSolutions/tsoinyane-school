package com.tsoinyane.api.activitylog;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;

    private final ActivityLogRepository activityLogRepository;

    @Transactional(readOnly = true)
    public ActivityLogPageDto getLogs(
            Long schoolId,
            String query,
            String action,
            String module,
            Boolean success,
            Integer page,
            Integer pageSize
    ) {
        int resolvedPageSize = resolvePageSize(pageSize);
        int resolvedPage = Math.max(1, page != null ? page : 1);
        Page<ActivityLog> resultPage = activityLogRepository.findPage(
                schoolId,
                normalizeText(query),
                normalizeText(action),
                normalizeText(module),
                success,
                PageRequest.of(
                        resolvedPage - 1,
                        resolvedPageSize,
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
                )
        );

        return ActivityLogPageDto.builder()
                .logs(resultPage.stream()
                .map(this::toDto)
                .toList())
                .totalLogs(resultPage.getTotalElements())
                .currentPage(resolvedPage)
                .pageSize(resolvedPageSize)
                .totalPages(Math.max(1, resultPage.getTotalPages()))
                .actionOptions(activityLogRepository.findActionOptions(schoolId))
                .moduleOptions(activityLogRepository.findModuleOptions(schoolId))
                .build();
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

    private String normalizeText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private int resolvePageSize(Integer pageSize) {
        if (pageSize == null || pageSize < 1) {
            return DEFAULT_PAGE_SIZE;
        }

        return Math.min(pageSize, MAX_PAGE_SIZE);
    }
}
