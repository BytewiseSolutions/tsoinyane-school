package com.tsoinyane.api.event;

import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final SchoolRepository schoolRepository;
    private final CurrentUserService currentUserService;

    public List<EventDto> getEvents(Long schoolId, Boolean upcomingOnly) {
        List<Event> events = Boolean.TRUE.equals(upcomingOnly)
                ? eventRepository.findUpcomingBySchoolId(schoolId, LocalDate.now())
                : eventRepository.findAllBySchoolIdOrderByDateAsc(schoolId);

        return events.stream()
                .map(this::toDto)
                .toList();
    }

    public EventDto createEvent(EventDto request) {
        String name = normalize(request.getName());
        String location = normalize(request.getLocation());
        String eventType = normalizeNullable(request.getEventType());
        String description = normalizeNullable(request.getDescription());
        LocalDate date = request.getDate();
        LocalTime startTime = request.getStartTime();
        LocalTime endTime = request.getEndTime();

        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event name is required");
        }
        if (location.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event location is required");
        }
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event date is required");
        }
        validateTimeRange(startTime, endTime);

        School school = resolveSchool(request.getSchoolId());
        User actor = currentUserService.getCurrentUser();

        Event event = Event.builder()
                .name(name)
                .date(date)
                .startTime(startTime)
                .endTime(endTime)
                .location(location)
                .eventType(eventType)
                .description(description)
                .status(normalizeStatus(request.getStatus(), date))
                .school(school)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(eventRepository.save(event));
    }

    public EventDto updateEvent(Long id, EventDto request) {
        Event event = eventRepository.findWithSchoolById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        String name = normalize(request.getName());
        String location = normalize(request.getLocation());
        String eventType = normalizeNullable(request.getEventType());
        String description = normalizeNullable(request.getDescription());
        LocalDate date = request.getDate();
        LocalTime startTime = request.getStartTime();
        LocalTime endTime = request.getEndTime();

        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event name is required");
        }
        if (location.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event location is required");
        }
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Event date is required");
        }
        validateTimeRange(startTime, endTime);

        School school = resolveSchool(request.getSchoolId() != null ? request.getSchoolId() : event.getSchool().getId());

        event.setName(name);
        event.setDate(date);
        event.setStartTime(startTime);
        event.setEndTime(endTime);
        event.setLocation(location);
        event.setEventType(eventType);
        event.setDescription(description);
        event.setStatus(normalizeStatus(request.getStatus(), date));
        event.setSchool(school);
        event.setUpdatedBy(currentUserService.getCurrentUser());

        return toDto(eventRepository.save(event));
    }

    public void deleteEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        eventRepository.delete(event);
    }

    private School resolveSchool(Long schoolId) {
        if (schoolId == null || schoolId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is required");
        }

        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid schoolId: " + schoolId));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeNullable(String value) {
        String normalized = normalize(value);
        return normalized.isBlank() ? null : normalized;
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (startTime != null && endTime != null && !endTime.isAfter(startTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
    }

    private String normalizeStatus(String status, LocalDate date) {
        String normalized = normalize(status);
        if (!normalized.isBlank()) {
            return normalized;
        }

        return date != null && date.isBefore(LocalDate.now()) ? "Past" : "Upcoming";
    }

    private EventDto toDto(Event event) {
        School school = event.getSchool();

        return EventDto.builder()
                .id(event.getId())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .name(event.getName())
                .date(event.getDate())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .location(event.getLocation())
                .eventType(event.getEventType())
                .description(event.getDescription())
                .status(event.getStatus())
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .createdById(event.getCreatedBy() != null ? event.getCreatedBy().getId() : null)
                .createdByName(event.getCreatedBy() != null ? event.getCreatedBy().getDisplayName() : null)
                .updatedById(event.getUpdatedBy() != null ? event.getUpdatedBy().getId() : null)
                .updatedByName(event.getUpdatedBy() != null ? event.getUpdatedBy().getDisplayName() : null)
                .build();
    }
}
