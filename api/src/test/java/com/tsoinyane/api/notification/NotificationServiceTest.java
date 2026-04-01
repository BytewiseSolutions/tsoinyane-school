package com.tsoinyane.api.notification;

import com.tsoinyane.api.ApiApplication;
import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.school.SchoolType;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest(
        classes = ApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:notification-service;MODE=MySQL;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.flyway.enabled=false"
        }
)
@Transactional
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolRepository schoolRepository;

    @MockitoBean
    private CurrentUserService currentUserService;

    private School school;
    private User schoolAdmin;
    private User teacher;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        userRepository.deleteAll();
        schoolRepository.deleteAll();

        school = schoolRepository.save(School.builder()
                .name("Tsoinyane Primary School")
                .code("TPS")
                .type(SchoolType.PRIMARY)
                .build());

        saveUser("system@tsoinyane.co.ls", "System", "Admin", Set.of(Role.SYSTEM_ADMIN), Set.of());
        schoolAdmin = saveUser("schooladmin@tsoinyane.co.ls", "School", "Admin", Set.of(Role.SCHOOL_ADMIN), Set.of(school));
        teacher = saveUser("teacher@tsoinyane.co.ls", "Test", "Teacher", Set.of(Role.TEACHER), Set.of(school));
    }

    @Test
    void getNotificationsHidesFutureAndExpiredNotificationsFromRecipients() {
        Instant now = Instant.now();
        saveNotification("Active Notice", now.minusSeconds(300), now.plusSeconds(3_600), schoolAdmin);
        saveNotification("Scheduled Later", now.plusSeconds(3_600), null, schoolAdmin);
        saveNotification("Expired Notice", now.minusSeconds(7_200), now.minusSeconds(60), schoolAdmin);

        when(currentUserService.getCurrentUser()).thenReturn(teacher);

        List<NotificationDto> notifications = notificationService.getNotifications(school.getId());

        assertThat(notifications).extracting(NotificationDto::getTitle)
                .containsExactly("Active Notice");
        assertThat(notifications.get(0).isRead()).isFalse();
    }

    @Test
    void getNotificationsKeepsScheduledAndExpiredNotificationsVisibleToTheirCreator() {
        Instant now = Instant.now();
        Notification future = saveNotification("Scheduled Later", now.plusSeconds(3_600), null, schoolAdmin);
        Notification expired = saveNotification("Expired Notice", now.minusSeconds(7_200), now.minusSeconds(60), schoolAdmin);

        when(currentUserService.getCurrentUser()).thenReturn(schoolAdmin);

        List<NotificationDto> notifications = notificationService.getNotifications(school.getId());

        assertThat(notifications).extracting(NotificationDto::getId)
                .contains(future.getId(), expired.getId());
        assertThat(notifications).allMatch(NotificationDto::isRead);
    }

    @Test
    void markNotificationAsReadUpdatesReadByUserIdsAndReturnsUpdatedNotification() {
        Notification notification = saveNotification("Staff Meeting", Instant.now().minusSeconds(60), null, schoolAdmin);
        when(currentUserService.getCurrentUser()).thenReturn(teacher);

        NotificationDto updated = notificationService.markNotificationAsRead(notification.getId());
        List<NotificationDto> notifications = notificationService.getNotifications(school.getId());

        assertThat(updated.isRead()).isTrue();
        assertThat(notificationRepository.findById(notification.getId()))
                .isPresent()
                .get()
                .extracting(n -> n.getReadByUserIds().contains(teacher.getId()))
                .isEqualTo(true);
        assertThat(notifications).extracting(NotificationDto::isRead).containsExactly(true);
    }

    private User saveUser(String email, String firstName, String lastName, Set<Role> roles, Set<School> schools) {
        return userRepository.save(User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .password("secret")
                .roles(roles)
                .schools(schools)
                .build());
    }

    private Notification saveNotification(String title, Instant scheduledAt, Instant expiresAt, User createdBy) {
        return notificationRepository.save(Notification.builder()
                .title(title)
                .message(title + " message")
                .type("ANNOUNCEMENT")
                .icon("fa-bullhorn")
                .schoolId(school.getId())
                .schoolName(school.getName())
                .scheduledAt(scheduledAt)
                .expiresAt(expiresAt)
                .audienceRoles(Set.of(Role.TEACHER))
                .createdBy(createdBy)
                .updatedBy(createdBy)
                .build());
    }
}
