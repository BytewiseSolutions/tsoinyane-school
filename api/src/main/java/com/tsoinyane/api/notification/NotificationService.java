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

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final String ANNOUNCEMENT_TYPE = "ANNOUNCEMENT";
    private static final String ANNOUNCEMENT_ICON = "fa-bullhorn";
    private static final int MAX_NOTIFICATIONS = 30;

    private final NotificationRepository notificationRepository;
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
        boolean canSend = canSendNotifications(currentRoles);
        Instant now = Instant.now();
        List<Long> accessibleSchoolIds = accessibleSchoolIds(currentUser.getId());
        Long requestedSchoolId = resolveRequestedSchoolId(schoolId, systemAdmin, accessibleSchoolIds);

        List<Notification> visible = new ArrayList<>(notificationRepository.findVisibleToRoles(currentRoles));
        if (canSend) {
            visible.addAll(notificationRepository.findAllByCreatedById(currentUser.getId()));
        }

        return visible.stream()
                .filter(n -> isVisibleForSchool(n, requestedSchoolId, systemAdmin, accessibleSchoolIds))
                .filter(n -> isVisibleAtThisTime(n, currentUser.getId(), now))
                .collect(Collectors.toMap(
                        Notification::getId,
                        n -> n,
                        (left, right) -> left,
                        java.util.LinkedHashMap::new
                ))
                .values().stream()
                .sorted(Comparator.comparing(this::getNotificationTimestamp, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Notification::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_NOTIFICATIONS)
                .map(n -> toDto(n, currentUser.getId(), systemAdmin))
                .toList();
    }

    @Transactional
    public NotificationDto createNotification(NotificationDto request) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> senderRoles = normalizeRoles(currentUser.getRoles());
        if (!canSendNotifications(senderRoles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to send notifications.");
        }

        Set<Role> audienceRoles = normalizeRoles(request.getAudienceRoles());
        if (audienceRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient role is required.");
        }

        boolean systemAdmin = senderRoles.contains(Role.SYSTEM_ADMIN);
        if (!systemAdmin && audienceRoles.contains(Role.SYSTEM_ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "School administrators cannot send notifications to system administrators.");
        }

        List<Long> senderSchoolIds = accessibleSchoolIds(currentUser.getId());
        Long targetSchoolId = resolveTargetSchoolId(request.getSchoolId(), systemAdmin, senderSchoolIds);
        validateSchedule(request.getScheduledAt(), request.getExpiresAt(), false);
        String targetSchoolName = resolveSchoolName(targetSchoolId);

        Notification notification = notificationRepository.save(Notification.builder()
                .title(request.getTitle().trim())
                .message(request.getMessage().trim())
                .type(ANNOUNCEMENT_TYPE)
                .icon(ANNOUNCEMENT_ICON)
                .schoolId(targetSchoolId)
                .schoolName(targetSchoolName)
                .scheduledAt(request.getScheduledAt())
                .expiresAt(request.getExpiresAt())
                .audienceRoles(audienceRoles)
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build());

        return toDto(notification, currentUser.getId(), systemAdmin);
    }

    @Transactional
    public NotificationDto updateNotification(Long id, NotificationDto request) {
        User currentUser = currentUserService.getCurrentUser();
        Set<Role> senderRoles = normalizeRoles(currentUser.getRoles());
        if (!canSendNotifications(senderRoles)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to edit notifications.");
        }

        Notification notification = notificationRepository.findWithCreatedByById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found."));

        boolean systemAdmin = senderRoles.contains(Role.SYSTEM_ADMIN);
        validateEditPermission(notification, currentUser, systemAdmin);

        Set<Role> audienceRoles = normalizeRoles(request.getAudienceRoles());
        if (audienceRoles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient role is required.");
        }

        if (!systemAdmin && audienceRoles.contains(Role.SYSTEM_ADMIN)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "School administrators cannot send notifications to system administrators.");
        }

        List<Long> senderSchoolIds = accessibleSchoolIds(currentUser.getId());
        Long targetSchoolId = resolveTargetSchoolId(request.getSchoolId(), systemAdmin, senderSchoolIds);
        validateSchedule(request.getScheduledAt(), request.getExpiresAt(), true);
        String targetSchoolName = resolveSchoolName(targetSchoolId);

        notification.setTitle(request.getTitle().trim());
        notification.setMessage(request.getMessage().trim());
        notification.setSchoolId(targetSchoolId);
        notification.setSchoolName(targetSchoolName);
        notification.setScheduledAt(request.getScheduledAt());
        notification.setExpiresAt(request.getExpiresAt());
        notification.setAudienceRoles(audienceRoles);
        notification.setUpdatedBy(currentUser);

        return toDto(notificationRepository.save(notification), currentUser.getId(), systemAdmin);
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

        validateEditPermission(notification, currentUser, senderRoles.contains(Role.SYSTEM_ADMIN));
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
        List<Long> accessibleSchoolIds = accessibleSchoolIds(currentUser.getId());
        Instant now = Instant.now();

        if (!isVisibleToUser(notification, currentUser, currentRoles, systemAdmin, accessibleSchoolIds, now)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification was not found.");
        }

        if (!isCreatedBy(notification, currentUser.getId())) {
            notification.getReadByUserIds().add(currentUser.getId());
            notificationRepository.save(notification);
        }

        return toDto(notification, currentUser.getId(), systemAdmin);
    }

    private NotificationDto toDto(Notification notification, Long currentUserId, boolean systemAdmin) {
        String senderName = notification.getCreatedBy() != null ? notification.getCreatedBy().getDisplayName() : "System";
        String senderEmail = notification.getCreatedBy() != null ? notification.getCreatedBy().getEmail() : null;
        boolean read = isCreatedBy(notification, currentUserId) || notification.getReadByUserIds().contains(currentUserId);
        Instant readAt = read && !isCreatedBy(notification, currentUserId) ? notification.getUpdatedAt() : null;

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
                .readAt(readAt)
                .read(read)
                .editable(canEditNotification(notification, currentUserId, systemAdmin))
                .build();
    }

    private List<Long> accessibleSchoolIds(Long userId) {
        return schoolRepository.findAllByUsers_Id(userId).stream()
                .map(School::getId)
                .distinct()
                .toList();
    }

    private String resolveSchoolName(Long schoolId) {
        if (schoolId == null) return null;
        return schoolRepository.findById(schoolId)
                .map(School::getName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected school was not found."));
    }

    private Set<Role> normalizeRoles(Collection<Role> roles) {
        if (roles == null || roles.isEmpty()) return Set.of();
        return roles.stream()
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Long resolveRequestedSchoolId(Long requestedSchoolId, boolean systemAdmin, List<Long> accessibleSchoolIds) {
        if (requestedSchoolId == null) return null;
        if (systemAdmin || accessibleSchoolIds.contains(requestedSchoolId)) return requestedSchoolId;
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to view notifications for that school.");
    }

    private Long resolveTargetSchoolId(Long requestedSchoolId, boolean systemAdmin, List<Long> senderSchoolIds) {
        if (systemAdmin) return requestedSchoolId;
        if (requestedSchoolId != null) {
            if (senderSchoolIds.contains(requestedSchoolId)) return requestedSchoolId;
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to send notifications for that school.");
        }
        if (senderSchoolIds.size() == 1) return senderSchoolIds.get(0);
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a school before sending this notification.");
    }

    private boolean isVisibleForSchool(Notification n, Long requestedSchoolId, boolean systemAdmin, List<Long> accessibleSchoolIds) {
        if (requestedSchoolId != null) return n.getSchoolId() == null || requestedSchoolId.equals(n.getSchoolId());
        if (systemAdmin || n.getSchoolId() == null) return true;
        return accessibleSchoolIds.contains(n.getSchoolId());
    }

    private boolean isVisibleAtThisTime(Notification n, Long currentUserId, Instant now) {
        if (isCreatedBy(n, currentUserId)) return true;
        if (n.getScheduledAt() != null && n.getScheduledAt().isAfter(now)) return false;
        return n.getExpiresAt() == null || n.getExpiresAt().isAfter(now);
    }

    private boolean isVisibleToUser(Notification n, User user, Set<Role> roles, boolean systemAdmin, List<Long> accessibleSchoolIds, Instant now) {
        boolean matchesRole = n.getAudienceRoles().stream().anyMatch(roles::contains);
        if (!matchesRole && !isCreatedBy(n, user.getId())) return false;
        return isVisibleForSchool(n, null, systemAdmin, accessibleSchoolIds) && isVisibleAtThisTime(n, user.getId(), now);
    }

    private boolean canSendNotifications(Set<Role> roles) {
        return roles.contains(Role.SYSTEM_ADMIN) || roles.contains(Role.SCHOOL_ADMIN);
    }

    private boolean canEditNotification(Notification n, Long currentUserId, boolean systemAdmin) {
        if (systemAdmin) return true;
        return n.getCreatedBy() != null && n.getCreatedBy().getId() != null && n.getCreatedBy().getId().equals(currentUserId);
    }

    private void validateEditPermission(Notification n, User currentUser, boolean systemAdmin) {
        if (!canEditNotification(n, currentUser.getId(), systemAdmin)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to edit this notification.");
        }
    }

    private void validateSchedule(Instant scheduledAt, Instant expiresAt, boolean allowPastExpiry) {
        if (scheduledAt != null && expiresAt != null && !expiresAt.isAfter(scheduledAt)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry time must be after the scheduled publish time.");
        }
        Instant now = Instant.now();
        if (!allowPastExpiry && scheduledAt != null && !scheduledAt.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Publish time must be in the future.");
        }
        if (!allowPastExpiry && expiresAt != null && !expiresAt.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry time must be in the future.");
        }
    }

    private boolean isCreatedBy(Notification n, Long currentUserId) {
        return n.getCreatedBy() != null && n.getCreatedBy().getId() != null && n.getCreatedBy().getId().equals(currentUserId);
    }

    private Instant getNotificationTimestamp(Notification n) {
        return n.getScheduledAt() != null ? n.getScheduledAt() : n.getCreatedAt();
    }
}
