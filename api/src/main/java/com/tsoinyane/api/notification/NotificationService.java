package com.tsoinyane.api.notification;

import com.tsoinyane.api.event.EventRepository;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.teacher.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final EventRepository eventRepository;

    public List<NotificationDto> getNotifications(Long schoolId) {
        List<NotificationDto> notifications = new ArrayList<>();

        studentRepository.findRecentForDashboard(schoolId, PageRequest.of(0, 4)).forEach(student ->
                notifications.add(NotificationDto.builder()
                        .type("STUDENT")
                        .icon("fa-user-graduate")
                        .title("New Student Enrolled")
                        .message(buildStudentMessage(student))
                        .timestamp(student.getCreatedAt())
                        .build())
        );

        teacherRepository.findRecentForNotifications(schoolId, PageRequest.of(0, 4)).forEach(teacher ->
                notifications.add(NotificationDto.builder()
                        .type("TEACHER")
                        .icon("fa-chalkboard-teacher")
                        .title("New Teacher Added")
                        .message(buildTeacherMessage(teacher))
                        .timestamp(teacher.getCreatedAt())
                        .build())
        );

        LocalDate today = LocalDate.now();

        eventRepository.findUpcomingBySchoolId(schoolId, today).stream()
                .filter(event -> event.getDate() != null)
                .filter(event -> {
                    long daysUntil = ChronoUnit.DAYS.between(today, event.getDate());
                    return daysUntil >= 0 && daysUntil <= 7;
                })
                .limit(4)
                .forEach(event -> notifications.add(NotificationDto.builder()
                        .type("EVENT_REMINDER")
                        .icon("fa-calendar-days")
                        .title(buildEventTitle(event.getDate(), today))
                        .message(buildEventMessage(event.getName(), event.getDate(), event.getLocation(), today))
                        .timestamp(event.getDate().atStartOfDay(ZoneId.systemDefault()).toInstant())
                        .build()));

        return notifications.stream()
                .sorted(Comparator.comparing(NotificationDto::getTimestamp, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(8)
                .toList();
    }

    private String buildStudentMessage(Student student) {
        String name = student.getUser() != null ? student.getUser().getDisplayName() : "A student";
        String gradeName = student.getGrade() != null ? student.getGrade().getName() : "a grade";
        return name + " has been added to " + gradeName + ".";
    }

    private String buildTeacherMessage(Teacher teacher) {
        String name = teacher.getUser() != null ? teacher.getUser().getDisplayName() : "A teacher";
        String schoolName = teacher.getSchool() != null ? teacher.getSchool().getName() : "the school";
        return name + " was assigned to " + schoolName + ".";
    }

    private String buildEventTitle(LocalDate eventDate, LocalDate today) {
        long daysUntil = ChronoUnit.DAYS.between(today, eventDate);

        if (daysUntil == 0) {
            return "Event Today";
        }

        if (daysUntil == 1) {
            return "Event Tomorrow";
        }

        return "Event Reminder";
    }

    private String buildEventMessage(String name, LocalDate date, String location, LocalDate today) {
        if (date == null) {
          return name + " is scheduled at " + location + ".";
        }

        long daysUntil = ChronoUnit.DAYS.between(today, date);
        String timing;

        if (daysUntil == 0) {
            timing = "today";
        } else if (daysUntil == 1) {
            timing = "tomorrow";
        } else {
            timing = "in " + daysUntil + " days";
        }

        return name + " is scheduled " + timing + " at " + location + ".";
    }
}
