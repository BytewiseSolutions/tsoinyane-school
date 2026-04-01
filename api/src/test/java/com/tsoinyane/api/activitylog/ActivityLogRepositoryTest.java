package com.tsoinyane.api.activitylog;

import com.tsoinyane.api.ApiApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        classes = ApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:activitylog-repository;MODE=MySQL;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.flyway.enabled=false"
        }
)
@Transactional
class ActivityLogRepositoryTest {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @BeforeEach
    void setUp() {
        activityLogRepository.deleteAll();
    }

    @Test
    void findPageAppliesSchoolSearchAndOutcomeFiltersInDatabase() {
        saveLog(Instant.parse("2026-03-30T10:00:00Z"), "Alice Admin", "alice@tsoinyane.co.ls",
                "CREATE", "Users", "Created users Jane Doe", "/users", true, 1L, "Tsoinyane Primary School");
        saveLog(Instant.parse("2026-03-30T09:00:00Z"), "Alice Admin", "alice@tsoinyane.co.ls",
                "CREATE", "Users", "Created users Bob", "/users", false, 1L, "Tsoinyane Primary School");
        saveLog(Instant.parse("2026-03-30T08:00:00Z"), "Other Admin", "other@tsoinyane.co.ls",
                "CREATE", "Users", "Created users Jane Doe", "/users", true, 2L, "Another School");
        saveLog(Instant.parse("2026-03-30T07:00:00Z"), "Global Admin", "global@tsoinyane.co.ls",
                "DELETE", "System", "Deleted system config", "/settings", true, null, null);

        Page<ActivityLog> page = activityLogRepository.findPage(
                1L,
                "jane",
                "CREATE",
                "Users",
                true,
                PageRequest.of(0, 10, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getActorEmail()).isEqualTo("alice@tsoinyane.co.ls");
        assertThat(page.getContent().get(0).getSchoolId()).isEqualTo(1L);
    }

    @Test
    void findPageReturnsRequestedSliceInDescendingCreatedAtOrder() {
        ActivityLog oldest = saveLog(Instant.parse("2026-03-30T08:00:00Z"), "First Admin", "first@tsoinyane.co.ls",
                "UPDATE", "Users", "Updated first record", "/users/1", true, 1L, "Tsoinyane Primary School");
        ActivityLog middle = saveLog(Instant.parse("2026-03-30T09:00:00Z"), "Second Admin", "second@tsoinyane.co.ls",
                "UPDATE", "Users", "Updated second record", "/users/2", true, 1L, "Tsoinyane Primary School");
        ActivityLog newest = saveLog(Instant.parse("2026-03-30T10:00:00Z"), "Third Admin", "third@tsoinyane.co.ls",
                "UPDATE", "Users", "Updated third record", "/users/3", true, 1L, "Tsoinyane Primary School");

        Page<ActivityLog> firstPage = activityLogRepository.findPage(
                1L,
                null,
                null,
                null,
                null,
                PageRequest.of(0, 2, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
        );
        Page<ActivityLog> secondPage = activityLogRepository.findPage(
                1L,
                null,
                null,
                null,
                null,
                PageRequest.of(1, 2, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")))
        );

        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.getContent()).extracting(ActivityLog::getId)
                .containsExactly(newest.getId(), middle.getId());
        assertThat(secondPage.getContent()).extracting(ActivityLog::getId)
                .containsExactly(oldest.getId());
    }

    @Test
    void optionQueriesReturnDistinctValuesForScopedLogs() {
        saveLog(Instant.parse("2026-03-30T10:00:00Z"), "Admin One", "one@tsoinyane.co.ls",
                "CREATE", "Users", "Created user", "/users", true, 1L, "Tsoinyane Primary School");
        saveLog(Instant.parse("2026-03-30T09:00:00Z"), "Admin Two", "two@tsoinyane.co.ls",
                "UPDATE", "Events", "Updated event", "/events", true, 1L, "Tsoinyane Primary School");
        saveLog(Instant.parse("2026-03-30T08:00:00Z"), "Admin Three", "three@tsoinyane.co.ls",
                "UPDATE", "Events", "Updated another event", "/events/2", true, 2L, "Another School");

        List<String> actionOptions = activityLogRepository.findActionOptions(1L);
        List<String> moduleOptions = activityLogRepository.findModuleOptions(1L);

        assertThat(actionOptions).containsExactly("CREATE", "UPDATE");
        assertThat(moduleOptions).containsExactly("Events", "Users");
    }

    private ActivityLog saveLog(
            Instant createdAt,
            String actorName,
            String actorEmail,
            String action,
            String module,
            String description,
            String endpoint,
            boolean success,
            Long schoolId,
            String schoolName
    ) {
        return activityLogRepository.save(ActivityLog.builder()
                .createdAt(createdAt)
                .actorName(actorName)
                .actorEmail(actorEmail)
                .action(action)
                .module(module)
                .description(description)
                .endpoint(endpoint)
                .httpMethod(success ? "POST" : "PATCH")
                .statusCode(success ? 200 : 400)
                .success(success)
                .schoolId(schoolId)
                .schoolName(schoolName)
                .build());
    }
}
