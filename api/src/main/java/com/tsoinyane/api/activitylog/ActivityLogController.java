package com.tsoinyane.api.activitylog;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/activity-log")
@RequiredArgsConstructor
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public List<ActivityLogDto> getLogs(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return activityLogService.getLogs(schoolId);
    }
}
