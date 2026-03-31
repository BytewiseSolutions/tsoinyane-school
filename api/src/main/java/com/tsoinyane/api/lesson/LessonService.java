package com.tsoinyane.api.lesson;

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
import java.util.List;

@Service
@RequiredArgsConstructor
public class LessonService {

    private final LessonRepository lessonRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
    private final TimetableRepository timetableRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<LessonDto> getLessons(Long timetableId) {
        return lessonRepository.findAllByTimetableId(timetableId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonDto getLesson(Long id) {
        return lessonRepository.findWithAssociationsById(id)
                .map(this::toDto)
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

        return toDto(lessonRepository.save(lesson));
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

        return toDto(lessonRepository.save(lesson));
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

    private LessonDto toDto(Lesson lesson) {
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
                .build();
    }
}
