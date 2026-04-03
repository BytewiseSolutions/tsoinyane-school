package com.tsoinyane.api.subjectassignment;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.grade.GradeRepository;
import com.tsoinyane.api.lesson.LessonRepository;
import com.tsoinyane.api.lesson.StudentLessonRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentDto;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.subject.SubjectRepository;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.teacher.TeacherRepository;
import com.tsoinyane.api.timetable.TimetableRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SubjectAssignmentService {

    private final SubjectAssignmentRepository subjectAssignmentRepository;
    private final SubjectRepository subjectRepository;
    private final GradeRepository gradeRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final TimetableRepository timetableRepository;
    private final LessonRepository lessonRepository;
    private final StudentLessonRepository studentLessonRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<SubjectAssignmentDto> getAssignments(Long schoolId) {
        return subjectAssignmentRepository.findAllBySchoolId(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubjectAssignmentDto getAssignment(Long id) {
        return subjectAssignmentRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject assignment not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<StudentDto> getAssignmentStudents(Long id) {
        SubjectAssignment assignment = subjectAssignmentRepository.findWithStudentsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject assignment not found: " + id));

        return assignment.getStudents().stream()
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional
    public List<StudentDto> updateAssignmentStudents(Long id, List<Long> studentIds) {
        SubjectAssignment assignment = subjectAssignmentRepository.findWithStudentsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject assignment not found: " + id));

        List<Student> students = studentIds == null || studentIds.isEmpty()
                ? List.of()
                : studentRepository.findAllById(studentIds);

        if (studentIds != null && students.size() != studentIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more selected students were not found");
        }

        validateStudentsForAssignment(assignment, students);

        LinkedHashSet<Student> studentSet = new LinkedHashSet<>(students);
        assignment.setStudents(studentSet);
        subjectAssignmentRepository.save(assignment);

        return students.stream().map(this::toStudentDto).toList();
    }

    @Transactional
    public SubjectAssignmentDto createAssignment(SubjectAssignmentDto request) {
        Subject subject = resolveSubject(request.getSubjectId());
        Long schoolId = subject.getSchool() != null ? subject.getSchool().getId() : null;
        Grade grade = resolveGrade(request.getGradeId(), schoolId);
        validateUniqueAssignment(subject.getId(), grade.getId(), null);
        Teacher teacher = resolveTeacher(request.getTeacherId(), schoolId);
        User actor = currentUserService.getCurrentUser();

        SubjectAssignment assignment = SubjectAssignment.builder()
                .subject(subject)
                .grade(grade)
                .teacher(teacher)
                .status(request.getStatus() != null ? request.getStatus() : Status.ACTIVE)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(subjectAssignmentRepository.save(assignment));
    }

    @Transactional
    public SubjectAssignmentDto updateAssignment(Long id, SubjectAssignmentDto request) {
        SubjectAssignment assignment = subjectAssignmentRepository.findWithStudentsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject assignment not found: " + id));

        Subject subject = resolveSubject(request.getSubjectId() != null ? request.getSubjectId() : assignment.getSubject().getId());
        Long schoolId = subject.getSchool() != null ? subject.getSchool().getId() : null;
        Grade grade = resolveGrade(request.getGradeId(), schoolId);
        validateUniqueAssignment(subject.getId(), grade.getId(), id);
        Teacher teacher = resolveTeacher(request.getTeacherId(), schoolId);
        User actor = currentUserService.getCurrentUser();

        assignment.setSubject(subject);
        assignment.setGrade(grade);
        assignment.setTeacher(teacher);
        assignment.setStatus(request.getStatus() != null ? request.getStatus() : assignment.getStatus());
        assignment.setUpdatedBy(actor);

        return toDto(subjectAssignmentRepository.save(assignment));
    }

    @Transactional
    public void deleteAssignment(Long id) {
        SubjectAssignment assignment = subjectAssignmentRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject assignment not found: " + id));

        List<Long> timetableIds = timetableRepository.findAllBySubjectAssignmentId(id)
                .stream()
                .map(timetable -> timetable.getId())
                .toList();

        if (!timetableIds.isEmpty()) {
            List<Long> lessonIds = lessonRepository.findIdsByTimetableIdIn(timetableIds);
            if (!lessonIds.isEmpty()) {
                studentLessonRepository.deleteAllByLessonIdIn(lessonIds);
                lessonRepository.deleteAllById(lessonIds);
            }
            timetableRepository.deleteAllById(timetableIds);
        }

        subjectAssignmentRepository.delete(assignment);
    }

    private void validateStudentsForAssignment(SubjectAssignment assignment, List<Student> students) {
        Long schoolId = assignment.getSubject() != null && assignment.getSubject().getSchool() != null
                ? assignment.getSubject().getSchool().getId()
                : null;
        Grade grade = assignment.getGrade();
        Long gradeId = grade != null ? grade.getId() : null;

        boolean hasInvalidStudent = students.stream().anyMatch(student -> {
            Long studentSchoolId = student.getSchool() != null ? student.getSchool().getId() : null;
            Long studentGradeId = student.getGrade() != null ? student.getGrade().getId() : null;

            return !Objects.equals(studentSchoolId, schoolId) || !Objects.equals(studentGradeId, gradeId);
        });

        if (hasInvalidStudent) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Students assigned to a subject assignment must belong to the same school and grade"
            );
        }
    }

    private Subject resolveSubject(Long subjectId) {
        if (subjectId == null || subjectId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject is required");
        }

        return subjectRepository.findWithAssociationsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subjectId: " + subjectId));
    }

    private Grade resolveGrade(Long gradeId, Long schoolId) {
        if (gradeId == null || gradeId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade is required");
        }

        Grade grade = gradeRepository.findWithSchoolById(gradeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid gradeId: " + gradeId));

        if (grade.getSchool() == null || !Objects.equals(grade.getSchool().getId(), schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected grade does not belong to the selected school");
        }

        return grade;
    }

    private Teacher resolveTeacher(Long teacherId, Long schoolId) {
        if (teacherId == null || teacherId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher is required");
        }

        Teacher teacher = teacherRepository.findWithUserAndSchoolById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid teacherId: " + teacherId));

        if (teacher.getSchool() == null || !Objects.equals(teacher.getSchool().getId(), schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected teacher does not belong to the selected school");
        }

        return teacher;
    }

    private void validateUniqueAssignment(Long subjectId, Long gradeId, Long assignmentId) {
        boolean exists = assignmentId == null
                ? subjectAssignmentRepository.existsBySubject_IdAndGrade_Id(subjectId, gradeId)
                : subjectAssignmentRepository.existsBySubject_IdAndGrade_IdAndIdNot(subjectId, gradeId, assignmentId);
        if (exists) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This subject is already assigned to the selected grade."
            );
        }
    }

    private SubjectAssignmentDto toDto(SubjectAssignment assignment) {
        Subject subject = assignment.getSubject();
        Grade grade = assignment.getGrade();
        Teacher teacher = assignment.getTeacher();

        return SubjectAssignmentDto.builder()
                .id(assignment.getId())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .schoolId(subject != null && subject.getSchool() != null ? subject.getSchool().getId() : null)
                .schoolName(subject != null && subject.getSchool() != null ? subject.getSchool().getName() : null)
                .subjectId(subject != null ? subject.getId() : null)
                .subjectCode(subject != null ? subject.getCode() : null)
                .subjectName(subject != null ? subject.getName() : null)
                .gradeId(grade != null ? grade.getId() : null)
                .gradeName(grade != null ? grade.getName() : null)
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherName(teacher != null && teacher.getUser() != null ? teacher.getUser().getDisplayName() : null)
                .studentCount(assignment.getStudents() != null ? assignment.getStudents().size() : 0)
                .status(assignment.getStatus())
                .createdById(assignment.getCreatedBy() != null ? assignment.getCreatedBy().getId() : null)
                .createdByName(assignment.getCreatedBy() != null ? assignment.getCreatedBy().getDisplayName() : null)
                .updatedById(assignment.getUpdatedBy() != null ? assignment.getUpdatedBy().getId() : null)
                .updatedByName(assignment.getUpdatedBy() != null ? assignment.getUpdatedBy().getDisplayName() : null)
                .build();
    }

    private StudentDto toStudentDto(Student student) {
        User user = student.getUser();
        String displayName = user != null
                ? ((user.getFirstName() != null ? user.getFirstName() : "") + " "
                + (user.getLastName() != null ? user.getLastName() : "")).trim()
                : null;

        return StudentDto.builder()
                .id(student.getId())
                .studentNumber(student.getStudentNumber())
                .userFullName(displayName)
                .userEmail(user != null ? user.getEmail() : null)
                .userPhone(user != null ? user.getPhone() : null)
                .build();
    }

}
