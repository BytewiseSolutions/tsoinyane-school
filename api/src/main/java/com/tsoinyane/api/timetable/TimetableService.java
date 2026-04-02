package com.tsoinyane.api.timetable;

import com.tsoinyane.api.lesson.Lesson;
import com.tsoinyane.api.lesson.LessonRepository;
import com.tsoinyane.api.lesson.LessonStatus;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.subject.SubjectRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {
    private static final int RECURRING_LESSON_WEEKS = 12;

    private final TimetableRepository timetableRepository;
    private final SubjectRepository subjectRepository;
    private final LessonRepository lessonRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<TimetableDto> getTimetables(Long subjectId) {
        return timetableRepository.findAllBySubjectId(subjectId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TimetableDto getTimetable(Long id) {
        return timetableRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id));
    }

    @Transactional
    public TimetableDto createTimetable(TimetableDto request) {
        Subject subject = resolveSubject(request.getSubjectId());
        DayOfWeek dayOfWeek = requireDayOfWeek(request);
        validateTimes(request.getStartTime(), request.getEndTime());
        Set<Student> students = resolveStudents(subject);
        validateNoConflicts(subject, dayOfWeek, request.getStartTime(), request.getEndTime(), null, students);
        User actor = currentUserService.getCurrentUser();

        Timetable timetable = Timetable.builder()
                .dayOfWeek(dayOfWeek)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .subject(subject)
                .students(students)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        Timetable saved = timetableRepository.save(timetable);
        lessonRepository.saveAll(generateRecurringLessons(saved, actor));

        return toDto(saved);
    }

    @Transactional
    public TimetableDto updateTimetable(Long id, TimetableDto request) {
        Timetable timetable = timetableRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id));

        Subject subject = resolveSubject(request.getSubjectId());
        DayOfWeek dayOfWeek = requireDayOfWeek(request);
        validateTimes(request.getStartTime(), request.getEndTime());
        Set<Student> students = resolveStudents(subject);
        validateNoConflicts(subject, dayOfWeek, request.getStartTime(), request.getEndTime(), timetable.getId(), students);
        User actor = currentUserService.getCurrentUser();

        timetable.setDayOfWeek(dayOfWeek);
        timetable.setStartTime(request.getStartTime());
        timetable.setEndTime(request.getEndTime());
        timetable.setSubject(subject);
        timetable.setStudents(students);
        timetable.setUpdatedBy(actor);

        return toDto(timetableRepository.save(timetable));
    }

    @Transactional
    public void deleteTimetable(Long id) {
        if (!timetableRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Timetable not found: " + id);
        }

        timetableRepository.deleteById(id);
    }

    private Subject resolveSubject(Long subjectId) {
        if (subjectId == null || subjectId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
        }

        return subjectRepository.findWithStudentsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subjectId: " + subjectId));
    }

    private Set<Student> resolveStudents(Subject subject) {
        Set<Student> students = subject.getStudents() == null
                ? new LinkedHashSet<>()
                : new LinkedHashSet<>(subject.getStudents());

        if (students.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assign students to the subject before creating a timetable");
        }

        School school = subject.getSchool();
        List<Long> invalidSchoolIds = students.stream()
                .filter(student -> student.getSchool() == null || school == null || !student.getSchool().getId().equals(school.getId()))
                .map(Student::getId)
                .toList();
        if (!invalidSchoolIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Some assigned students do not belong to the subject school: " + invalidSchoolIds);
        }

        return students;
    }

    private void validateNoConflicts(
            Subject subject,
            DayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            Long excludeTimetableId,
            Set<Student> students
    ) {
        School school = subject.getSchool();
        if (school == null || school.getId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject school is required");
        }

        Set<Long> studentIds = students.stream()
                .map(Student::getId)
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toSet());

        for (Timetable existing : timetableRepository.findPotentialConflicts(school.getId(), dayOfWeek, excludeTimetableId)) {
            if (!timesOverlap(startTime, endTime, existing.getStartTime(), existing.getEndTime())) {
                continue;
            }

            Subject existingSubject = existing.getSubject();
            if (existingSubject != null && existingSubject.getId() != null && existingSubject.getId().equals(subject.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "This subject already has an overlapping timetable on " + dayOfWeek + " at " + formatTimeRange(existing.getStartTime(), existing.getEndTime())
                );
            }

            Long teacherId = subject.getTeacher() != null ? subject.getTeacher().getId() : null;
            Long existingTeacherId = existingSubject != null && existingSubject.getTeacher() != null
                    ? existingSubject.getTeacher().getId()
                    : null;
            if (teacherId != null && teacherId.equals(existingTeacherId)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "The assigned teacher already has an overlapping timetable for "
                                + (existingSubject != null ? existingSubject.getName() : "another subject")
                                + " on " + dayOfWeek + " at " + formatTimeRange(existing.getStartTime(), existing.getEndTime())
                );
            }

            List<Long> sharedStudentIds = existing.getStudents().stream()
                    .map(Student::getId)
                    .filter(studentIds::contains)
                    .toList();
            if (!sharedStudentIds.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "This timetable overlaps with another lesson slot that already includes some of the same students on "
                                + dayOfWeek + " at " + formatTimeRange(existing.getStartTime(), existing.getEndTime())
                );
            }
        }
    }

    private void validateTimes(LocalTime startTime, LocalTime endTime) {
        if (startTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time is required");
        }
        if (endTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time is required");
        }
        if (!startTime.isBefore(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }
    }

    private java.time.DayOfWeek requireDayOfWeek(TimetableDto request) {
        if (request.getDayOfWeek() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day of week is required");
        }

        return request.getDayOfWeek();
    }

    private List<Lesson> generateRecurringLessons(Timetable timetable, User actor) {
        DayOfWeek targetDay = timetable.getDayOfWeek();
        LocalDate nextOccurrence = LocalDate.now()
                .with(java.time.temporal.TemporalAdjusters.nextOrSame(targetDay));
        List<Lesson> lessons = new ArrayList<>(RECURRING_LESSON_WEEKS);

        for (int weekOffset = 0; weekOffset < RECURRING_LESSON_WEEKS; weekOffset++) {
            LocalDate occurrence = nextOccurrence.plusWeeks(weekOffset);
            LocalDateTime startTime = LocalDateTime.of(occurrence, timetable.getStartTime());
            LocalDateTime endTime = LocalDateTime.of(occurrence, timetable.getEndTime());

            lessons.add(Lesson.builder()
                    .date(startTime)
                    .startTime(startTime)
                    .endTime(endTime)
                    .status(LessonStatus.PENDING)
                    .submitted(Boolean.FALSE)
                    .subject(timetable.getSubject())
                    .teacher(timetable.getSubject() != null ? timetable.getSubject().getTeacher() : null)
                    .timetable(timetable)
                    .createdBy(actor)
                    .updatedBy(actor)
                    .build());
        }

        return lessons;
    }

    private boolean timesOverlap(LocalTime startTime, LocalTime endTime, LocalTime existingStart, LocalTime existingEnd) {
        return startTime.isBefore(existingEnd) && endTime.isAfter(existingStart);
    }

    private String formatTimeRange(LocalTime startTime, LocalTime endTime) {
        return startTime + " - " + endTime;
    }

    private TimetableDto toDto(Timetable timetable) {
        Subject subject = timetable.getSubject();
        School school = subject != null ? subject.getSchool() : null;

        return TimetableDto.builder()
                .id(timetable.getId())
                .createdAt(timetable.getCreatedAt())
                .updatedAt(timetable.getUpdatedAt())
                .createdById(timetable.getCreatedBy() != null ? timetable.getCreatedBy().getId() : null)
                .createdByName(timetable.getCreatedBy() != null ? timetable.getCreatedBy().getDisplayName() : null)
                .updatedById(timetable.getUpdatedBy() != null ? timetable.getUpdatedBy().getId() : null)
                .updatedByName(timetable.getUpdatedBy() != null ? timetable.getUpdatedBy().getDisplayName() : null)
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .dayOfWeek(timetable.getDayOfWeek())
                .startTime(timetable.getStartTime())
                .endTime(timetable.getEndTime())
                .subjectId(subject != null ? subject.getId() : null)
                .subjectName(subject != null ? subject.getName() : null)
                .studentIds(timetable.getStudents().stream().map(Student::getId).toList())
                .studentCount(timetable.getStudents().size())
                .lessonCount((int) lessonRepository.countByTimetable_Id(timetable.getId()))
                .build();
    }
}
