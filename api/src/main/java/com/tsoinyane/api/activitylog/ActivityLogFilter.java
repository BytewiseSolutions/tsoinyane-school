package com.tsoinyane.api.activitylog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.security.AuthenticatedUser;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
@RequiredArgsConstructor
public class ActivityLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogFilter.class);
    private static final int REQUEST_CACHE_LIMIT = 32 * 1024;
    private static final List<String> TRACKED_METHODS = List.of("POST", "PUT", "PATCH", "DELETE");
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        return servletPath == null
                || servletPath.startsWith("/activity-log")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request, REQUEST_CACHE_LIMIT);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        Exception failure = null;

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } catch (Exception ex) {
            failure = ex;
            throw ex;
        } finally {
            try {
                maybeRecordActivity(wrappedRequest, wrappedResponse, failure);
            } catch (Exception ex) {
                log.warn("Activity log write failed for {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);
            } finally {
                wrappedResponse.copyBodyToResponse();
            }
        }
    }

    private void maybeRecordActivity(
            ContentCachingRequestWrapper request,
            ContentCachingResponseWrapper response,
            Exception failure
    ) {
        String method = request.getMethod().toUpperCase(Locale.ROOT);
        if (!TRACKED_METHODS.contains(method)) {
            return;
        }

        String servletPath = request.getServletPath();
        JsonNode requestJson = readJson(request.getContentAsByteArray());
        JsonNode responseJson = readJson(response.getContentAsByteArray());
        AuthContext authContext = resolveAuthContext(requestJson, responseJson);
        Long schoolId = resolveSchoolId(request, requestJson, responseJson, authContext.actor());
        String schoolName = resolveSchoolName(schoolId, authContext.actor());
        Long targetId = resolveTargetId(servletPath, requestJson, responseJson);
        int statusCode = failure != null && response.getStatus() < 400 ? 500 : response.getStatus();
        boolean success = failure == null && statusCode < 400;
        String action = resolveAction(method, servletPath);
        String module = resolveModule(servletPath);

        activityLogService.record(ActivityLogWriteRequest.builder()
                .actorId(authContext.actorId())
                .actorName(authContext.actorName())
                .actorEmail(authContext.actorEmail())
                .action(action)
                .module(module)
                .targetId(targetId)
                .description(buildDescription(action, module, targetId, requestJson, responseJson, success))
                .endpoint(servletPath)
                .httpMethod(method)
                .statusCode(statusCode)
                .success(success)
                .ipAddress(resolveIpAddress(request))
                .schoolId(schoolId)
                .schoolName(schoolName)
                .build());
    }

    private AuthContext resolveAuthContext(JsonNode requestJson, JsonNode responseJson) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser principal) {
            User actor = userRepository.findById(principal.id()).orElse(null);
            if (actor != null) {
                return new AuthContext(actor.getId(), actor.getDisplayName(), actor.getEmail(), actor);
            }

            return new AuthContext(principal.id(), principal.email(), principal.email(), null);
        }

        Long actorId = readLong(responseJson, "user", "id");
        String actorEmail = firstNonBlank(
                readText(requestJson, "email"),
                readText(responseJson, "user", "email")
        );
        String actorName = firstNonBlank(
                combineNames(readText(responseJson, "user", "firstName"), readText(responseJson, "user", "lastName")),
                actorEmail,
                "Anonymous"
        );

        return new AuthContext(actorId, actorName, actorEmail, actorId != null ? userRepository.findById(actorId).orElse(null) : null);
    }

    private Long resolveSchoolId(
            HttpServletRequest request,
            JsonNode requestJson,
            JsonNode responseJson,
            User actor
    ) {
        Long fromQuery = parseLong(request.getParameter("schoolId"));
        if (fromQuery != null) {
            return fromQuery;
        }

        Long fromBody = firstNonNull(
                readLong(requestJson, "schoolId"),
                readSingleId(requestJson, "schoolIds"),
                readLong(responseJson, "schoolId"),
                readSingleId(responseJson, "schoolIds")
        );
        if (fromBody != null) {
            return fromBody;
        }

        if (actor != null && actor.getSchools() != null && actor.getSchools().size() == 1) {
            return actor.getSchools().iterator().next().getId();
        }

        return null;
    }

    private String resolveSchoolName(Long schoolId, User actor) {
        if (schoolId == null) {
            return actor != null && actor.getSchools() != null && actor.getSchools().size() == 1
                    ? actor.getSchools().iterator().next().getName()
                    : null;
        }

        return schoolRepository.findById(schoolId)
                .map(School::getName)
                .orElse(null);
    }

    private Long resolveTargetId(String servletPath, JsonNode requestJson, JsonNode responseJson) {
        Long fromResponse = readLong(responseJson, "id");
        if (fromResponse != null) {
            return fromResponse;
        }

        Long fromRequest = readLong(requestJson, "id");
        if (fromRequest != null) {
            return fromRequest;
        }

        List<String> parts = Arrays.stream(servletPath.split("/"))
                .filter(part -> !part.isBlank())
                .toList();

        return parts.stream()
                .filter(this::isNumeric)
                .map(this::parseLong)
                .filter(java.util.Objects::nonNull)
                .reduce((first, second) -> second)
                .orElse(null);
    }

    private String resolveAction(String method, String servletPath) {
        if ("/auth/login".equals(servletPath)) {
            return "LOGIN";
        }
        if ("/auth/forgot-password".equals(servletPath)) {
            return "PASSWORD_RESET_REQUEST";
        }

        return switch (method) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> method;
        };
    }

    private String resolveModule(String servletPath) {
        List<String> parts = Arrays.stream(servletPath.split("/"))
                .filter(part -> !part.isBlank())
                .filter(part -> !isNumeric(part))
                .toList();

        if (parts.isEmpty()) {
            return "System";
        }

        return parts.stream()
                .map(this::humanize)
                .collect(Collectors.joining(" "));
    }

    private String buildDescription(
            String action,
            String module,
            Long targetId,
            JsonNode requestJson,
            JsonNode responseJson,
            boolean success
    ) {
        String targetLabel = firstNonBlank(
                readLabel(responseJson),
                readLabel(requestJson),
                targetId != null ? "#" + targetId : null
        );

        String prefix = success ? actionVerb(action) : "Failed to " + actionVerb(action).toLowerCase(Locale.ROOT);
        String moduleLabel = module.toLowerCase(Locale.ROOT);

        if (targetLabel != null) {
            return prefix + " " + moduleLabel + " " + targetLabel;
        }

        return prefix + " " + moduleLabel;
    }

    private String actionVerb(String action) {
        return switch (action) {
            case "LOGIN" -> "Signed in";
            case "PASSWORD_RESET_REQUEST" -> "Requested password reset";
            case "CREATE" -> "Created";
            case "UPDATE" -> "Updated";
            case "DELETE" -> "Deleted";
            default -> humanize(action);
        };
    }

    private String readLabel(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }

        String fullName = combineNames(readText(node, "firstName"), readText(node, "lastName"));
        return firstNonBlank(
                readText(node, "name"),
                readText(node, "title"),
                fullName,
                readText(node, "email"),
                readText(node, "code"),
                readText(node, "studentNumber"),
                readText(node, "user", "email")
        );
    }

    private String resolveIpAddress(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }

    private JsonNode readJson(byte[] content) {
        if (content == null || content.length == 0) {
            return OBJECT_MAPPER.createObjectNode();
        }

        try {
            String body = new String(content, StandardCharsets.UTF_8).trim();
            if (body.isEmpty()) {
                return OBJECT_MAPPER.createObjectNode();
            }

            return OBJECT_MAPPER.readTree(body);
        } catch (IOException ex) {
            return OBJECT_MAPPER.createObjectNode();
        }
    }

    private String readText(JsonNode node, String... path) {
        JsonNode current = traverse(node, path);
        if (current == null || current.isMissingNode() || current.isNull()) {
            return null;
        }

        String value = current.asText(null);
        return value != null && !value.isBlank() ? value.trim() : null;
    }

    private Long readLong(JsonNode node, String... path) {
        JsonNode current = traverse(node, path);
        if (current == null || current.isMissingNode() || current.isNull()) {
            return null;
        }

        if (current.isNumber()) {
            return current.longValue();
        }

        return parseLong(current.asText(null));
    }

    private Long readSingleId(JsonNode node, String fieldName) {
        JsonNode value = traverse(node, fieldName);
        if (value == null || !value.isArray() || value.size() != 1) {
            return null;
        }

        return value.get(0).isNumber() ? value.get(0).longValue() : parseLong(value.get(0).asText(null));
    }

    private JsonNode traverse(JsonNode node, String... path) {
        JsonNode current = node;
        for (String segment : path) {
            if (current == null || current.isMissingNode() || current.isNull()) {
                return null;
            }
            current = current.path(segment);
        }
        return current;
    }

    private String combineNames(String firstName, String lastName) {
        String combined = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        return combined.isBlank() ? null : combined;
    }

    private String humanize(String value) {
        return Arrays.stream(value.split("[-_]"))
                .filter(part -> !part.isBlank())
                .map(part -> part.substring(0, 1).toUpperCase(Locale.ROOT) + part.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private boolean isNumeric(String value) {
        return value != null && value.chars().allMatch(Character::isDigit);
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    @SafeVarargs
    private <T> T firstNonNull(T... values) {
        for (T value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String firstNonBlank(String... values) {
        return Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .map(String::trim)
                .orElse(null);
    }

    private record AuthContext(Long actorId, String actorName, String actorEmail, User actor) {
    }
}
