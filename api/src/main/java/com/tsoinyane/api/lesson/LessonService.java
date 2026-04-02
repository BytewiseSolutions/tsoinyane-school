package com.tsoinyane.api.lesson;

import com.tsoinyane.api.attendance.AttendanceStatus;
import com.tsoinyane.api.homework.HomeworkStatus;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.subject.SubjectRepository;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.teacher.TeacherRepository;
import com.tsoinyane.api.timetable.Timetable;
import com.tsoinyane.api.timetable.TimetableRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final StudentLessonRepository studentLessonRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
    private final TimetableRepository timetableRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<LessonDto> getLessons(Long timetableId) {
        List<Lesson> lessons = lessonRepository.findAllByTimetableId(timetableId);
        Map<Long, LessonStats> statsByLessonId = loadLessonStats(lessons);

        return lessons.stream()
                .map(lesson -> toDto(lesson, statsByLessonId.getOrDefault(lesson.getId(), LessonStats.empty())))
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonDto getLesson(Long id) {
        return lessonRepository.findWithAssociationsById(id)
                .map(lesson -> toDto(lesson, loadLessonStats(List.of(lesson)).getOrDefault(lesson.getId(), LessonStats.empty())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found: " + id));
    }

    @Transactional
    public LessonDto createLesson(LessonDto request) {
        Subject subject = resolveSubject(request.getSubjectId());
        Teacher teacher = resolveTeacher(request.getTeacherId());
        Timetable timetable = resolveTimetable(request.getTimetableId());
        validateTimes(request.getStartTime(), request.getEndTime());
        User actor = currentUserService.getCurrentUser();

        Lesson lesson = Lesson.builder()
                .cancellationReason(normalizeNullable(request.getCancellationReason()))
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(request.getStatus() != null ? request.getStatus() : LessonStatus.PENDING)
                .submitted(request.getSubmitted() != null ? request.getSubmitted() : Boolean.FALSE)
                .subject(subject)
                .teacher(teacher)
                .timetable(timetable)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(lessonRepository.save(lesson), LessonStats.empty());
    }

    @Transactional
    public LessonDto updateLesson(Long id, LessonDto request) {
        Lesson lesson = lessonRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found: " + id));

        Subject subject = resolveSubject(request.getSubjectId());
        Teacher teacher = resolveTeacher(request.getTeacherId());
        Timetable timetable = resolveTimetable(request.getTimetableId());
        validateTimes(request.getStartTime(), request.getEndTime());
        User actor = currentUserService.getCurrentUser();

        lesson.setCancellationReason(normalizeNullable(request.getCancellationReason()));
        lesson.setDate(request.getDate());
        lesson.setStartTime(request.getStartTime());
        lesson.setEndTime(request.getEndTime());
        lesson.setStatus(request.getStatus());
        lesson.setSubmitted(request.getSubmitted() != null ? request.getSubmitted() : lesson.getSubmitted());
        lesson.setSubject(subject);
        lesson.setTeacher(teacher);
        lesson.setTimetable(timetable);
        lesson.setUpdatedBy(actor);

        return toDto(lessonRepository.save(lesson), loadLessonStats(List.of(lesson)).getOrDefault(lesson.getId(), LessonStats.empty()));
    }

    @Transactional
    public void deleteLesson(Long id) {
        if (!lessonRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found: " + id);
        }

        lessonRepository.deleteById(id);
    }

    private Subject resolveSubject(Long subjectId) {
        if (subjectId == null || subjectId <= 0) {
            return null;
        }

        return subjectRepository.findWithAssociationsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subjectId: " + subjectId));
    }

    private Teacher resolveTeacher(Long teacherId) {
        if (teacherId == null || teacherId <= 0) {
            return null;
        }

        return teacherRepository.findWithUserAndSchoolById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid teacherId: " + teacherId));
    }

    private Timetable resolveTimetable(Long timetableId) {
        if (timetableId == null || timetableId <= 0) {
            return null;
        }

        return timetableRepository.findWithAssociationsById(timetableId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid timetableId: " + timetableId));
    }

    private void validateTimes(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            return;
        }

        if (!startTime.isBefore(endTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Map<Long, LessonStats> loadLessonStats(List<Lesson> lessons) {
        if (lessons.isEmpty()) {
            return Collections.emptyMap();
        }

        List<Long> lessonIds = lessons.stream()
                .map(Lesson::getId)
                .filter(id -> id != null && id > 0)
                .toList();
        if (lessonIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, LessonStats> statsByLessonId = new LinkedHashMap<>();
        studentLessonRepository.findAllByLessonIdIn(lessonIds).forEach(studentLesson -> {
            Long lessonId = studentLesson.getLesson() != null ? studentLesson.getLesson().getId() : null;
            if (lessonId == null) {
                return;
            }

            statsByLessonId
                    .computeIfAbsent(lessonId, ignored -> new LessonStats())
                    .include(studentLesson);
        });

        return statsByLessonId;
    }

    private LessonDto toDto(Lesson lesson, LessonStats stats) {
        Subject subject = lesson.getSubject();
        Teacher teacher = lesson.getTeacher();
        Timetable timetable = lesson.getTimetable();

        return LessonDto.builder()
                .id(lesson.getId())
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .createdById(lesson.getCreatedBy() != null ? lesson.getCreatedBy().getId() : null)
                .createdByName(lesson.getCreatedBy() != null ? lesson.getCreatedBy().getDisplayName() : null)
                .updatedById(lesson.getUpdatedBy() != null ? lesson.getUpdatedBy().getId() : null)
                .updatedByName(lesson.getUpdatedBy() != null ? lesson.getUpdatedBy().getDisplayName() : null)
                .schoolId(subject != null && subject.getSchool() != null ? subject.getSchool().getId() : null)
                .schoolName(subject != null && subject.getSchool() != null ? subject.getSchool().getName() : null)
                .cancellationReason(lesson.getCancellationReason())
                .date(lesson.getDate())
                .startTime(lesson.getStartTime())
                .endTime(lesson.getEndTime())
                .status(lesson.getStatus())
                .submitted(lesson.getSubmitted())
                .subjectId(subject != null ? subject.getId() : null)
                .subjectName(subject != null ? subject.getName() : null)
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherName(teacher != null && teacher.getUser() != null ? teacher.getUser().getDisplayName() : null)
                .timetableId(timetable != null ? timetable.getId() : null)
                .studentCount(stats.studentCount)
                .attendancePresentCount(stats.attendancePresentCount)
                .attendanceLateCount(stats.attendanceLateCount)
                .attendanceAbsentCount(stats.attendanceAbsentCount)
                .attendancePendingCount(stats.attendancePendingCount)
                .homeworkDoneCount(stats.homeworkDoneCount)
                .homeworkNotDoneCount(stats.homeworkNotDoneCount)
                .homeworkNoneCount(stats.homeworkNoneCount)
                .homeworkPendingCount(stats.homeworkPendingCount)
                .build();
    }

    private static final class LessonStats {
        private int studentCount;
        private int attendancePresentCount;
        private int attendanceLateCount;
        private int attendanceAbsentCount;
        private int attendancePendingCount;
        private int homeworkDoneCount;
        private int homeworkNotDoneCount;
        private int homeworkNoneCount;
        private int homeworkPendingCount;

        private void include(StudentLesson studentLesson) {
            studentCount++;

            AttendanceStatus attendanceStatus = studentLesson.getAttendanceStatus();
            if (attendanceStatus == AttendanceStatus.PRESENT) {
                attendancePresentCount++;
            } else if (attendanceStatus == AttendanceStatus.LATE) {
                attendanceLateCount++;
            } else if (attendanceStatus == AttendanceStatus.ABSENT) {
                attendanceAbsentCount++;
            } else {
                attendancePendingCount++;
            }

            HomeworkStatus homeworkStatus = studentLesson.getHomeworkStatus();
            if (homeworkStatus == HomeworkStatus.DONE) {
                homeworkDoneCount++;
            } else if (homeworkStatus == HomeworkStatus.NOT_DONE) {
                homeworkNotDoneCount++;
            } else if (homeworkStatus == HomeworkStatus.NONE) {
                homeworkNoneCount++;
            } else {
                homeworkPendingCount++;
            }
        }

        private static LessonStats empty() {
            return new LessonStats();
        }
    }
}
