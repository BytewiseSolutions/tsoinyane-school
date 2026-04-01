package com.tsoinyane.api.lesson;

import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentLessonService {

    private final StudentLessonRepository studentLessonRepository;
    private final LessonRepository lessonRepository;
    private final StudentRepository studentRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<StudentLessonDto> getStudentLessons(Long lessonId) {
        return studentLessonRepository.findAllByLessonId(lessonId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentLessonDto getStudentLesson(Long id) {
        return studentLessonRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student lesson not found: " + id));
    }

    @Transactional
    public StudentLessonDto createStudentLesson(StudentLessonDto request) {
        Lesson lesson = resolveLesson(request.getLessonId());
        Student student = resolveStudent(request.getStudentId(), lesson);
        ensureNotDuplicate(lesson.getId(), student.getId());
        User actor = currentUserService.getCurrentUser();

        StudentLesson studentLesson = StudentLesson.builder()
                .lesson(lesson)
                .student(student)
                .attendanceStatus(request.getAttendanceStatus())
                .homeworkStatus(request.getHomeworkStatus())
                .absenceReason(request.getAbsenceReason())
                .comment(normalizeNullable(request.getComment()))
                .absenceComment(normalizeNullable(request.getAbsenceComment()))
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(studentLessonRepository.save(studentLesson));
    }

    @Transactional
    public StudentLessonDto updateStudentLesson(Long id, StudentLessonDto request) {
        StudentLesson existing = studentLessonRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student lesson not found: " + id));

        Lesson lesson = resolveLesson(request.getLessonId());
        Student student = resolveStudent(request.getStudentId(), lesson);
        if (!existing.getLesson().getId().equals(lesson.getId()) || !existing.getStudent().getId().equals(student.getId())) {
            ensureNotDuplicate(lesson.getId(), student.getId());
        }

        User actor = currentUserService.getCurrentUser();
        existing.setLesson(lesson);
        existing.setStudent(student);
        existing.setAttendanceStatus(request.getAttendanceStatus());
        existing.setHomeworkStatus(request.getHomeworkStatus());
        existing.setAbsenceReason(request.getAbsenceReason());
        existing.setComment(normalizeNullable(request.getComment()));
        existing.setAbsenceComment(normalizeNullable(request.getAbsenceComment()));
        existing.setUpdatedBy(actor);

        return toDto(studentLessonRepository.save(existing));
    }

    @Transactional
    public void deleteStudentLesson(Long id) {
        if (!studentLessonRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student lesson not found: " + id);
        }

        studentLessonRepository.deleteById(id);
    }

    private Lesson resolveLesson(Long lessonId) {
        if (lessonId == null || lessonId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lesson is required");
        }

        return lessonRepository.findWithAssociationsById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid lessonId: " + lessonId));
    }

    private Student resolveStudent(Long studentId, Lesson lesson) {
        if (studentId == null || studentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student is required");
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid studentId: " + studentId));

        boolean linkedToLesson = lesson.getTimetable() != null
                && lesson.getTimetable().getStudents().stream()
                .anyMatch(item -> item.getId() != null && item.getId().equals(student.getId()));
        if (!linkedToLesson) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected student is not linked to this lesson");
        }

        return student;
    }

    private void ensureNotDuplicate(Long lessonId, Long studentId) {
        if (studentLessonRepository.existsByLesson_IdAndStudent_Id(lessonId, studentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student is already added to this lesson");
        }
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private StudentLessonDto toDto(StudentLesson studentLesson) {
        Student student = studentLesson.getStudent();
        Lesson lesson = studentLesson.getLesson();
        String displayName = student != null && student.getUser() != null
                ? student.getUser().getDisplayName()
                : null;

        return StudentLessonDto.builder()
                .id(studentLesson.getId())
                .createdAt(studentLesson.getCreatedAt())
                .updatedAt(studentLesson.getUpdatedAt())
                .createdById(studentLesson.getCreatedBy() != null ? studentLesson.getCreatedBy().getId() : null)
                .createdByName(studentLesson.getCreatedBy() != null ? studentLesson.getCreatedBy().getDisplayName() : null)
                .updatedById(studentLesson.getUpdatedBy() != null ? studentLesson.getUpdatedBy().getId() : null)
                .updatedByName(studentLesson.getUpdatedBy() != null ? studentLesson.getUpdatedBy().getDisplayName() : null)
                .schoolId(student != null && student.getSchool() != null ? student.getSchool().getId() : null)
                .schoolName(student != null && student.getSchool() != null ? student.getSchool().getName() : null)
                .lessonId(lesson != null ? lesson.getId() : null)
                .studentId(student != null ? student.getId() : null)
                .studentName(displayName)
                .studentNumber(student != null ? student.getStudentNumber() : null)
                .attendanceStatus(studentLesson.getAttendanceStatus())
                .homeworkStatus(studentLesson.getHomeworkStatus())
                .absenceReason(studentLesson.getAbsenceReason())
                .comment(studentLesson.getComment())
                .absenceComment(studentLesson.getAbsenceComment())
                .build();
    }
}
