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
                        .icon("fa-user-graduate")
                        .title("New Student Enrolled")
                        .message(buildStudentMessage(student))
                        .timestamp(student.getCreatedAt())
                        .build())
        );

        teacherRepository.findRecentForNotifications(schoolId, PageRequest.of(0, 4)).forEach(teacher ->
                notifications.add(NotificationDto.builder()
                        .icon("fa-chalkboard-teacher")
                        .title("New Teacher Added")
                        .message(buildTeacherMessage(teacher))
                        .timestamp(teacher.getCreatedAt())
                        .build())
        );

        eventRepository.findUpcomingBySchoolId(schoolId, LocalDate.now()).stream()
                .limit(4)
                .forEach(event -> notifications.add(NotificationDto.builder()
                        .icon("fa-calendar-days")
                        .title("Upcoming Event")
                        .message(buildEventMessage(event.getName(), event.getDate(), event.getLocation()))
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

    private String buildEventMessage(String name, LocalDate date, String location) {
        if (date == null) {
          return name + " is scheduled at " + location + ".";
        }

        return name + " is scheduled for " + date + " at " + location + ".";
    }
}
