package com.tsoinyane.api.activitylog;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/activity-log")
@RequiredArgsConstructor
@Secured("ROLE_SYSTEM_ADMIN")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public ActivityLogPageDto getLogs(
            @RequestParam(value = "schoolId", required = false) Long schoolId,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "module", required = false) String module,
            @RequestParam(value = "success", required = false) Boolean success,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "pageSize", required = false) Integer pageSize
    ) {
        return activityLogService.getLogs(schoolId, query, action, module, success, page, pageSize);
    }
}
