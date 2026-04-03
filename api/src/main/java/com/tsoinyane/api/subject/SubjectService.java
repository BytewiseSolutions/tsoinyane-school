package com.tsoinyane.api.subject;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentDto;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.subjectassignment.SubjectAssignment;
import com.tsoinyane.api.subjectassignment.SubjectAssignmentRepository;
import com.tsoinyane.api.subjectassignment.SubjectAssignmentService;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.timetable.TimetableRepository;
import com.tsoinyane.api.lesson.LessonRepository;
import com.tsoinyane.api.lesson.StudentLessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final SubjectAssignmentRepository subjectAssignmentRepository;
    private final SchoolRepository schoolRepository;
    private final StudentRepository studentRepository;
    private final TimetableRepository timetableRepository;
    private final LessonRepository lessonRepository;
    private final StudentLessonRepository studentLessonRepository;
    private final SubjectAssignmentService subjectAssignmentService;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<StudentDto> getSubjectStudents(Long subjectId) {
        Subject subject = subjectRepository.findWithAssociationsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found: " + subjectId));

        return subjectAssignmentRepository.findAllBySubjectId(subject.getId()).stream()
                .flatMap(assignment -> assignment.getStudents().stream())
                .distinct()
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional
    public List<StudentDto> updateSubjectStudents(Long subjectId, List<Long> studentIds) {
        Subject subject = subjectRepository.findWithAssociationsById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found: " + subjectId));

        List<SubjectAssignment> assignments = subjectAssignmentRepository.findAllBySubjectId(subject.getId());
        if (assignments.size() != 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Manage students on subject assignments now that a subject can have multiple grade offerings."
            );
        }

        return subjectAssignmentService.updateAssignmentStudents(assignments.get(0).getId(), studentIds);
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

    @Transactional(readOnly = true)
    public SubjectDto getSubject(Long id) {
        return subjectRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<SubjectDto> getSubjects(Long schoolId) {
        return subjectRepository.findAllBySchoolId(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public SubjectDto createSubject(SubjectDto request) {
        String code = normalize(request.getCode());
        String name = normalize(request.getName());

        if (code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject code is required");
        }
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        validateUniqueSubjectCode(code, school.getId(), null);
        User actor = currentUserService.getCurrentUser();

        Subject subject = Subject.builder()
                .code(code)
                .name(name)
                .school(school)
                .status(request.getStatus() != null ? request.getStatus() : Status.ACTIVE)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(subjectRepository.save(subject));
    }

    @Transactional
    public SubjectDto updateSubject(Long id, SubjectDto request) {
        Subject subject = subjectRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found: " + id));

        String code = normalize(request.getCode());
        String name = normalize(request.getName());

        if (code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject code is required");
        }
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        validateUniqueSubjectCode(code, school.getId(), id);
        User actor = currentUserService.getCurrentUser();

        subject.setCode(code);
        subject.setName(name);
        subject.setSchool(school);
        subject.setStatus(request.getStatus() != null ? request.getStatus() : subject.getStatus());
        subject.setUpdatedBy(actor);

        return toDto(subjectRepository.save(subject));
    }

    @Transactional
    public void deleteSubject(Long id) {
        if (!subjectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found: " + id);
        }

        List<Long> timetableIds = timetableRepository.findAllBySubjectId(id)
                .stream().map(t -> t.getId()).toList();

        if (!timetableIds.isEmpty()) {
            List<Long> lessonIds = lessonRepository.findIdsByTimetableIdIn(timetableIds);

            if (!lessonIds.isEmpty()) {
                studentLessonRepository.deleteAllByLessonIdIn(lessonIds);
                lessonRepository.deleteAllById(lessonIds);
            }

            timetableRepository.deleteAllById(timetableIds);
        }

        subjectAssignmentRepository.deleteAllBySubjectId(id);
        subjectRepository.deleteById(id);
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

    private void validateUniqueSubjectCode(String code, Long schoolId, Long subjectId) {
        boolean exists = subjectId == null
                ? subjectRepository.existsByCodeAndSchoolId(code, schoolId)
                : subjectRepository.existsByCodeAndSchoolIdAndIdNot(code, schoolId, subjectId);

        if (exists) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A subject with this code already exists for the selected school."
            );
        }
    }

    private SubjectDto toDto(Subject subject) {
        int assignmentCount = subjectAssignmentRepository.findAllBySubjectId(subject.getId()).size();

        return SubjectDto.builder()
                .id(subject.getId())
                .createdAt(subject.getCreatedAt())
                .updatedAt(subject.getUpdatedAt())
                .schoolId(subject.getSchool() != null ? subject.getSchool().getId() : null)
                .schoolName(subject.getSchool() != null ? subject.getSchool().getName() : null)
                .code(subject.getCode())
                .name(subject.getName())
                .assignmentCount(assignmentCount)
                .status(subject.getStatus())
                .createdById(subject.getCreatedBy() != null ? subject.getCreatedBy().getId() : null)
                .createdByName(subject.getCreatedBy() != null ? subject.getCreatedBy().getDisplayName() : null)
                .updatedById(subject.getUpdatedBy() != null ? subject.getUpdatedBy().getId() : null)
                .updatedByName(subject.getUpdatedBy() != null ? subject.getUpdatedBy().getDisplayName() : null)
                .build();
    }
}
