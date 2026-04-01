package com.tsoinyane.api.notification;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationDto> getNotifications(@RequestParam(value = "schoolId", required = false) Long schoolId) {
        return notificationService.getNotifications(schoolId);
    }

    @PostMapping
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public NotificationDto createNotification(@Valid @RequestBody NotificationCreateRequest request) {
        return notificationService.createNotification(request);
    }

    @PutMapping("/{id}")
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public NotificationDto updateNotification(@PathVariable Long id, @Valid @RequestBody NotificationCreateRequest request) {
        return notificationService.updateNotification(id, request);
    }

    @DeleteMapping("/{id}")
    @Secured({"ROLE_SYSTEM_ADMIN", "ROLE_SCHOOL_ADMIN"})
    public void deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
    }

    @PostMapping("/{id}/read")
    public NotificationDto markNotificationAsRead(@PathVariable Long id) {
        return notificationService.markNotificationAsRead(id);
    }
}
