package com.tsoinyane.api.activitylog;

import com.tsoinyane.api.ApiApplication;
import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.security.TokenService;
import com.tsoinyane.api.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = ApiApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.MOCK,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:activitylog-controller;MODE=MySQL;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.datasource.driver-class-name=org.h2.Driver",
                "spring.datasource.username=sa",
                "spring.datasource.password=",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "spring.flyway.enabled=false",
                "app.security.jwt.secret=test-secret"
        }
)
class ActivityLogControllerSecurityTest {

    @Autowired
    private TokenService tokenService;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private FilterChainProxy springSecurityFilterChain;

    @MockitoBean
    private ActivityLogService activityLogService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.mockMvc = webAppContextSetup(this.webApplicationContext)
                .addFilters(this.springSecurityFilterChain)
                .build();
    }

    @Test
    void getLogsRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/activity-log"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(activityLogService);
    }

    @Test
    void getLogsRejectsNonSystemAdmins() throws Exception {
        mockMvc.perform(get("/activity-log")
                        .header("Authorization", "Bearer " + accessTokenFor(Role.SCHOOL_ADMIN)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(activityLogService);
    }

    @Test
    void getLogsAllowsSystemAdmins() throws Exception {
        ActivityLogPageDto response = ActivityLogPageDto.builder()
                .logs(List.of(ActivityLogDto.builder()
                        .id(7L)
                        .createdAt(Instant.parse("2026-03-30T10:15:30Z"))
                        .actorName("System Admin")
                        .actorEmail("admin@tsoinyane.co.ls")
                        .action("CREATE")
                        .module("Users")
                        .description("Created users user@example.com")
                        .endpoint("/users")
                        .httpMethod("POST")
                        .statusCode(201)
                        .success(true)
                        .schoolName("Tsoinyane Primary School")
                        .build()))
                .totalLogs(1)
                .currentPage(1)
                .pageSize(10)
                .totalPages(1)
                .actionOptions(List.of("CREATE"))
                .moduleOptions(List.of("Users"))
                .build();

        when(activityLogService.getLogs(eq(2L), eq("admin"), eq("CREATE"), eq("Users"), eq(true), eq(2), eq(25)))
                .thenReturn(response);

        mockMvc.perform(get("/activity-log")
                        .header("Authorization", "Bearer " + accessTokenFor(Role.SYSTEM_ADMIN))
                        .queryParam("schoolId", "2")
                        .queryParam("query", "admin")
                        .queryParam("action", "CREATE")
                        .queryParam("module", "Users")
                        .queryParam("success", "true")
                        .queryParam("page", "2")
                        .queryParam("pageSize", "25")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLogs").value(1))
                .andExpect(jsonPath("$.currentPage").value(1))
                .andExpect(jsonPath("$.logs[0].action").value("CREATE"))
                .andExpect(jsonPath("$.actionOptions[0]").value("CREATE"));

        verify(activityLogService).getLogs(2L, "admin", "CREATE", "Users", true, 2, 25);
    }

    private String accessTokenFor(Role role) {
        User user = User.builder()
                .id(99L)
                .email("admin@tsoinyane.co.ls")
                .firstName("System")
                .lastName("Admin")
                .roles(Set.of(role))
                .build();

        return tokenService.generateAccessToken(user, System.currentTimeMillis() + 60_000);
    }
}
