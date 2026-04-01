package com.tsoinyane.api.notification;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String ANNOUNCEMENT_TYPE = "ANNOUNCEMENT";
    private static final String ANNOUNCEMENT_ICON = "fa-bullhorn";
    private static final int MAX_NOTIFICATIONS = 30;

    private final NotificationRepository notificationRepository;
    private final NotificationReadReceiptRepository notificationReadReceiptRepository;
    private final CurrentUserService currentUserService;
    private final SchoolRepository schoolRepository;

    @Transactional(readOnly = true)
    public List<NotificationDto> getNotifications(Long schoolId) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> currentRoles = normalizeRoles(currentUser.getRoles());
        if (currentRoles.isEmpty()) {
            return List.of();
        }

        boolean systemAdmin = currentRoles.contains(Role.SYSTEM_ADMIN);
        boolean canSendNotifications = canSendNotifications(currentRoles);
        Instant now = Instant.now();
        List<Long> accessibleSchoolIds = schoolRepository.findAllByUsers_Id(currentUser.getId()).stream()
                .map(School::getId)
                .distinct()
                .toList();
        Long requestedSchoolId = resolveRequestedSchoolId(schoolId, systemAdmin, accessibleSchoolIds);

        List<Notification> visibleNotifications = new ArrayList<>(notificationRepository.findVisibleToRoles(currentRoles));
        if (canSendNotifications) {
            visibleNotifications.addAll(notificationRepository.findAllByCreatedById(currentUser.getId()));
        }

        List<Notification> notifications = visibleNotifications.stream()
                .filter(notification -> isVisibleForSchool(notification, requestedSchoolId, systemAdmin, accessibleSchoolIds))
                .filter(notification -> isVisibleAtThisTime(notification, currentUser.getId(), now))
                .collect(java.util.stream.Collectors.toMap(
                        Notification::getId,
                        notification -> notification,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ))
                .values().stream()
                .sorted(Comparator.comparing(this::getNotificationTimestamp, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Notification::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_NOTIFICATIONS)
                .toList();

        Map<Long, NotificationReadReceipt> readReceipts = getReadReceiptsByNotificationId(notifications, currentUser.getId());

        return notifications.stream()
                .map(notification -> toDto(notification, currentUser.getId(), systemAdmin, readReceipts.get(notification.getId())))
                .toList();
    }

    @Transactional
    public NotificationDto createNotification(NotificationCreateRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> senderRoles = normalizeRoles(currentUser.getRoles());
        if (!canSendNotifications(senderRoles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to send notifications.");
        }

        Set<Role> audienceRoles = normalizeRoles(request.audienceRoles());
        if (audienceRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient role is required.");
        }

        boolean systemAdmin = senderRoles.contains(Role.SYSTEM_ADMIN);
        List<Long> senderSchoolIds = schoolRepository.findAllByUsers_Id(currentUser.getId()).stream()
                .map(School::getId)
                .distinct()
                .toList();
        Long targetSchoolId = resolveTargetSchoolId(request.schoolId(), systemAdmin, senderSchoolIds);
        validateSchedule(request.scheduledAt(), request.expiresAt(), false);
        String targetSchoolName = targetSchoolId != null
                ? schoolRepository.findById(targetSchoolId).map(School::getName).orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected school was not found."))
                : null;

        if (!systemAdmin && audienceRoles.contains(Role.SYSTEM_ADMIN)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "School administrators cannot send notifications to system administrators."
            );
        }

        Notification notification = notificationRepository.save(Notification.builder()
                .title(request.title().trim())
                .message(request.message().trim())
                .type(ANNOUNCEMENT_TYPE)
                .icon(ANNOUNCEMENT_ICON)
                .schoolId(targetSchoolId)
                .schoolName(targetSchoolName)
                .scheduledAt(request.scheduledAt())
                .expiresAt(request.expiresAt())
                .audienceRoles(audienceRoles)
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build());

        return toDto(notification, currentUser.getId(), systemAdmin, null);
    }

    @Transactional
    public NotificationDto updateNotification(Long id, NotificationCreateRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> senderRoles = normalizeRoles(currentUser.getRoles());
        if (!canSendNotifications(senderRoles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to edit notifications.");
        }

        Notification notification = notificationRepository.findWithCreatedByById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found."));

        boolean systemAdmin = senderRoles.contains(Role.SYSTEM_ADMIN);
        validateEditPermission(notification, currentUser, systemAdmin);

        Set<Role> audienceRoles = normalizeRoles(request.audienceRoles());
        if (audienceRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient role is required.");
        }

        List<Long> senderSchoolIds = schoolRepository.findAllByUsers_Id(currentUser.getId()).stream()
                .map(School::getId)
                .distinct()
                .toList();
        Long targetSchoolId = resolveTargetSchoolId(request.schoolId(), systemAdmin, senderSchoolIds);
        validateSchedule(request.scheduledAt(), request.expiresAt(), true);
        String targetSchoolName = targetSchoolId != null
                ? schoolRepository.findById(targetSchoolId).map(School::getName).orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected school was not found."))
                : null;

        if (!systemAdmin && audienceRoles.contains(Role.SYSTEM_ADMIN)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "School administrators cannot send notifications to system administrators."
            );
        }

        notification.setTitle(request.title().trim());
        notification.setMessage(request.message().trim());
        notification.setSchoolId(targetSchoolId);
        notification.setSchoolName(targetSchoolName);
        notification.setScheduledAt(request.scheduledAt());
        notification.setExpiresAt(request.expiresAt());
        notification.setAudienceRoles(audienceRoles);
        notification.setUpdatedBy(currentUser);

        Notification saved = notificationRepository.save(notification);
        return toDto(saved, currentUser.getId(), systemAdmin, null);
    }

    @Transactional
    public void deleteNotification(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> senderRoles = normalizeRoles(currentUser.getRoles());
        if (!canSendNotifications(senderRoles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to delete notifications.");
        }

        Notification notification = notificationRepository.findWithCreatedByById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found."));

        boolean systemAdmin = senderRoles.contains(Role.SYSTEM_ADMIN);
        validateEditPermission(notification, currentUser, systemAdmin);
        notificationReadReceiptRepository.deleteAllByNotification_Id(notification.getId());
        notificationRepository.delete(notification);
    }

    @Transactional
    public NotificationDto markNotificationAsRead(Long id) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> currentRoles = normalizeRoles(currentUser.getRoles());
        if (currentRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access notifications.");
        }

        Notification notification = notificationRepository.findWithCreatedByById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found."));

        boolean systemAdmin = currentRoles.contains(Role.SYSTEM_ADMIN);
        List<Long> accessibleSchoolIds = schoolRepository.findAllByUsers_Id(currentUser.getId()).stream()
                .map(School::getId)
                .distinct()
                .toList();
        Instant now = Instant.now();
        if (!isVisibleToUser(notification, currentUser, currentRoles, systemAdmin, accessibleSchoolIds, now)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found.");
        }

        if (isCreatedBy(notification, currentUser.getId())) {
            return toDto(notification, currentUser.getId(), systemAdmin, null);
        }

        NotificationReadReceipt receipt = notificationReadReceiptRepository
                .findByNotification_IdAndUser_Id(notification.getId(), currentUser.getId())
                .orElseGet(() -> notificationReadReceiptRepository.save(NotificationReadReceipt.builder()
                        .notification(notification)
                        .user(currentUser)
                        .readAt(now)
                        .build()));

        return toDto(notification, currentUser.getId(), systemAdmin, receipt);
    }

    private NotificationDto toDto(
            Notification notification,
            Long currentUserId,
            boolean systemAdmin,
            NotificationReadReceipt readReceipt
    ) {
        String senderName = notification.getCreatedBy() != null
                ? notification.getCreatedBy().getDisplayName()
                : "System";
        String senderEmail = notification.getCreatedBy() != null
                ? notification.getCreatedBy().getEmail()
                : null;
        boolean read = isCreatedBy(notification, currentUserId) || readReceipt != null;

        return NotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .icon(notification.getIcon())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .timestamp(getNotificationTimestamp(notification))
                .scheduledAt(notification.getScheduledAt())
                .expiresAt(notification.getExpiresAt())
                .schoolId(notification.getSchoolId())
                .schoolName(notification.getSchoolName())
                .senderName(senderName)
                .senderEmail(senderEmail)
                .audienceRoles(notification.getAudienceRoles().stream().sorted().toList())
                .readAt(readReceipt != null ? readReceipt.getReadAt() : null)
                .read(read)
                .editable(canEditNotification(notification, currentUserId, systemAdmin))
                .build();
    }

    private Set<Role> normalizeRoles(Collection<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return Set.of();
        }

        return roles.stream()
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }

    private Long resolveRequestedSchoolId(Long requestedSchoolId, boolean systemAdmin, List<Long> accessibleSchoolIds) {
        if (requestedSchoolId == null) {
            return null;
        }

        if (systemAdmin || accessibleSchoolIds.contains(requestedSchoolId)) {
            return requestedSchoolId;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to view notifications for that school.");
    }

    private Long resolveTargetSchoolId(Long requestedSchoolId, boolean systemAdmin, List<Long> senderSchoolIds) {
        if (systemAdmin) {
            return requestedSchoolId;
        }

        if (requestedSchoolId != null) {
            if (senderSchoolIds.contains(requestedSchoolId)) {
                return requestedSchoolId;
            }

            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to send notifications for that school.");
        }

        if (senderSchoolIds.size() == 1) {
            return senderSchoolIds.get(0);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a school before sending this notification.");
    }

    private boolean isVisibleForSchool(
            Notification notification,
            Long requestedSchoolId,
            boolean systemAdmin,
            List<Long> accessibleSchoolIds
    ) {
        if (requestedSchoolId != null) {
            return notification.getSchoolId() == null || requestedSchoolId.equals(notification.getSchoolId());
        }

        if (systemAdmin) {
            return true;
        }

        if (notification.getSchoolId() == null) {
            return true;
        }

        return accessibleSchoolIds.contains(notification.getSchoolId());
    }

    private boolean isVisibleAtThisTime(Notification notification, Long currentUserId, Instant now) {
        if (isCreatedBy(notification, currentUserId)) {
            return true;
        }

        if (notification.getScheduledAt() != null && notification.getScheduledAt().isAfter(now)) {
            return false;
        }

        return notification.getExpiresAt() == null || notification.getExpiresAt().isAfter(now);
    }

    private boolean isVisibleToUser(
            Notification notification,
            User currentUser,
            Set<Role> currentRoles,
            boolean systemAdmin,
            List<Long> accessibleSchoolIds,
            Instant now
    ) {
        boolean matchesRole = notification.getAudienceRoles().stream().anyMatch(currentRoles::contains);
        boolean creator = isCreatedBy(notification, currentUser.getId());
        if (!matchesRole && !creator) {
            return false;
        }

        return isVisibleForSchool(notification, null, systemAdmin, accessibleSchoolIds)
                && isVisibleAtThisTime(notification, currentUser.getId(), now);
    }

    private boolean canSendNotifications(Set<Role> roles) {
        return roles.contains(Role.SYSTEM_ADMIN) || roles.contains(Role.SCHOOL_ADMIN);
    }

    private boolean canEditNotification(Notification notification, Long currentUserId, boolean systemAdmin) {
        if (systemAdmin) {
            return true;
        }

        return notification.getCreatedBy() != null
                && notification.getCreatedBy().getId() != null
                && notification.getCreatedBy().getId().equals(currentUserId);
    }

    private void validateEditPermission(Notification notification, User currentUser, boolean systemAdmin) {
        if (canEditNotification(notification, currentUser.getId(), systemAdmin)) {
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to edit this notification.");
    }

    private void validateSchedule(Instant scheduledAt, Instant expiresAt, boolean allowPastExpiry) {
        if (scheduledAt != null && expiresAt != null && !expiresAt.isAfter(scheduledAt)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Expiry time must be after the scheduled publish time."
            );
        }

        if (!allowPastExpiry && expiresAt != null && !expiresAt.isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry time must be in the future.");
        }
    }

    private Map<Long, NotificationReadReceipt> getReadReceiptsByNotificationId(
            List<Notification> notifications,
            Long currentUserId
    ) {
        if (notifications.isEmpty()) {
            return Map.of();
        }

        List<Long> notificationIds = notifications.stream()
                .map(Notification::getId)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (notificationIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, NotificationReadReceipt> readReceiptsByNotificationId = new HashMap<>();
        notificationReadReceiptRepository.findAllByUser_IdAndNotification_IdIn(currentUserId, notificationIds)
                .forEach(receipt -> readReceiptsByNotificationId.put(receipt.getNotification().getId(), receipt));
        return readReceiptsByNotificationId;
    }

    private boolean isCreatedBy(Notification notification, Long currentUserId) {
        return notification.getCreatedBy() != null
                && notification.getCreatedBy().getId() != null
                && notification.getCreatedBy().getId().equals(currentUserId);
    }

    private Instant getNotificationTimestamp(Notification notification) {
        return notification.getScheduledAt() != null ? notification.getScheduledAt() : notification.getCreatedAt();
    }
}
