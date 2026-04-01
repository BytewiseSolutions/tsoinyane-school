package com.tsoinyane.api.activitylog;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class ActivityLogPageDto {
    List<ActivityLogDto> logs;
    long totalLogs;
    int currentPage;
    int pageSize;
    int totalPages;
    List<String> actionOptions;
    List<String> moduleOptions;
}
