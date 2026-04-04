package com.tsoinyane.api.assessment;

import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.subject.Subject;
import com.tsoinyane.api.subjectassignment.SubjectAssignment;
import com.tsoinyane.api.subjectassignment.SubjectAssignmentRepository;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.teacher.TeacherRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentMarkRepository assessmentMarkRepository;
    private final SubjectAssignmentRepository subjectAssignmentRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<AssessmentDto> getAssessments(Long schoolId, Long subjectAssignmentId, Long teacherId) {
        return assessmentRepository.findAllByFilters(schoolId, subjectAssignmentId, teacherId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssessmentDto getAssessment(Long id) {
        return assessmentRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found: " + id));
    }

    @Transactional
    public AssessmentDto createAssessment(AssessmentDto request) {
        SubjectAssignment subjectAssignment = resolveSubjectAssignment(request.getSubjectAssignmentId());
        Teacher teacher = resolveTeacher(request.getTeacherId(), subjectAssignment);
        validateAssessmentInput(request);
        User actor = currentUserService.getCurrentUser();

        Assessment assessment = Assessment.builder()
                .title(normalizeRequired(request.getTitle(), "Title"))
                .description(normalizeNullable(request.getDescription()))
                .type(request.getType() != null ? request.getType() : AssessmentType.TEST)
                .status(request.getStatus() != null ? request.getStatus() : AssessmentStatus.DRAFT)
                .assessmentDate(request.getAssessmentDate())
                .totalMarks(request.getTotalMarks())
                .passMark(request.getPassMark())
                .subjectAssignment(subjectAssignment)
                .teacher(teacher)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentDto updateAssessment(Long id, AssessmentDto request) {
        Assessment assessment = assessmentRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found: " + id));

        SubjectAssignment subjectAssignment = request.getSubjectAssignmentId() != null
                ? resolveSubjectAssignment(request.getSubjectAssignmentId())
                : assessment.getSubjectAssignment();
        Teacher teacher = resolveTeacher(request.getTeacherId() != null ? request.getTeacherId() : assessment.getTeacher().getId(), subjectAssignment);
        validateAssessmentInput(request);
        User actor = currentUserService.getCurrentUser();

        assessment.setTitle(normalizeRequired(request.getTitle(), "Title"));
        assessment.setDescription(normalizeNullable(request.getDescription()));
        assessment.setType(request.getType() != null ? request.getType() : assessment.getType());
        assessment.setStatus(request.getStatus() != null ? request.getStatus() : assessment.getStatus());
        assessment.setAssessmentDate(request.getAssessmentDate());
        assessment.setTotalMarks(request.getTotalMarks());
        assessment.setPassMark(request.getPassMark());
        assessment.setSubjectAssignment(subjectAssignment);
        assessment.setTeacher(teacher);
        assessment.setUpdatedBy(actor);

        return toDto(assessmentRepository.save(assessment));
    }

    @Transactional
    public void deleteAssessment(Long id) {
        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found: " + id));

        assessmentMarkRepository.deleteAllByAssessmentId(id);
        assessmentRepository.delete(assessment);
    }

    @Transactional(readOnly = true)
    public List<AssessmentMarkDto> getAssessmentMarks(Long assessmentId) {
        Assessment assessment = assessmentRepository.findWithAssociationsById(assessmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found: " + assessmentId));

        Map<Long, AssessmentMark> existingMarks = new LinkedHashMap<>();
        assessmentMarkRepository.findAllByAssessmentId(assessmentId).forEach(mark -> {
            if (mark.getStudent() != null && mark.getStudent().getId() != null) {
                existingMarks.put(mark.getStudent().getId(), mark);
            }
        });

        return assessment.getSubjectAssignment().getStudents().stream()
                .sorted(Comparator
                        .comparing((Student student) -> student.getStudentNumber() == null ? 1 : 0)
                        .thenComparing(student -> student.getStudentNumber() == null ? "" : student.getStudentNumber(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(student -> student.getUser() != null ? student.getUser().getDisplayName() : "", String.CASE_INSENSITIVE_ORDER))
                .map(student -> toMarkDto(existingMarks.get(student.getId()), assessment, student))
                .toList();
    }

    @Transactional
    public List<AssessmentMarkDto> saveAssessmentMarks(Long assessmentId, List<AssessmentMarkDto> requests) {
        Assessment assessment = assessmentRepository.findWithAssociationsById(assessmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assessment not found: " + assessmentId));

        Map<Long, Student> linkedStudents = new LinkedHashMap<>();
        assessment.getSubjectAssignment().getStudents().forEach(student -> {
            if (student.getId() != null) {
                linkedStudents.put(student.getId(), student);
            }
        });

        Map<Long, AssessmentMark> existingMarks = new LinkedHashMap<>();
        assessmentMarkRepository.findAllByAssessmentId(assessmentId).forEach(mark -> {
            if (mark.getStudent() != null && mark.getStudent().getId() != null) {
                existingMarks.put(mark.getStudent().getId(), mark);
            }
        });

        User actor = currentUserService.getCurrentUser();
        List<AssessmentMark> toSave = new ArrayList<>();
        List<AssessmentMark> toDelete = new ArrayList<>();

        for (AssessmentMarkDto request : requests == null ? List.<AssessmentMarkDto>of() : requests) {
            Long studentId = request.getStudentId();
            if (studentId == null || studentId <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student is required for every mark row.");
            }

            Student student = linkedStudents.get(studentId);
            if (student == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected student is not linked to this assessment.");
            }

            Double score = request.getScore();
            if (score != null) {
                if (score < 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Score cannot be negative.");
                }
                if (score > assessment.getTotalMarks()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Score cannot be greater than total marks.");
                }
            }

            String comment = normalizeNullable(request.getComment());
            AssessmentMark existing = existingMarks.get(studentId);

            if (score == null && comment == null) {
                if (existing != null) {
                    toDelete.add(existing);
                }
                continue;
            }

            AssessmentMark mark = existing != null ? existing : AssessmentMark.builder()
                    .assessment(assessment)
                    .student(student)
                    .createdBy(actor)
                    .build();

            mark.setScore(score);
            mark.setComment(comment);
            mark.setUpdatedBy(actor);
            toSave.add(mark);
        }

        if (!toDelete.isEmpty()) {
            assessmentMarkRepository.deleteAll(toDelete);
        }
        if (!toSave.isEmpty()) {
            assessmentMarkRepository.saveAll(toSave);
        }

        return getAssessmentMarks(assessmentId);
    }

    private SubjectAssignment resolveSubjectAssignment(Long subjectAssignmentId) {
        if (subjectAssignmentId == null || subjectAssignmentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject assignment is required.");
        }

        return subjectAssignmentRepository.findWithStudentsById(subjectAssignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid subject assignment."));
    }

    private Teacher resolveTeacher(Long teacherId, SubjectAssignment subjectAssignment) {
        Long schoolId = subjectAssignment.getSubject() != null && subjectAssignment.getSubject().getSchool() != null
                ? subjectAssignment.getSubject().getSchool().getId()
                : null;

        if (teacherId == null || teacherId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher is required.");
        }

        Teacher teacher = teacherRepository.findWithUserAndSchoolById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid teacher."));

        if (teacher.getSchool() == null || !Objects.equals(teacher.getSchool().getId(), schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected teacher does not belong to the selected school.");
        }

        Long assignmentTeacherId = subjectAssignment.getTeacher() != null ? subjectAssignment.getTeacher().getId() : null;
        if (assignmentTeacherId != null && !assignmentTeacherId.equals(teacher.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assessment teacher must match the subject assignment teacher.");
        }

        return teacher;
    }

    private void validateAssessmentInput(AssessmentDto request) {
        normalizeRequired(request.getTitle(), "Title");

        if (request.getTotalMarks() == null || request.getTotalMarks() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total marks must be greater than zero.");
        }

        if (request.getPassMark() != null) {
            if (request.getPassMark() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pass mark cannot be negative.");
            }
            if (request.getPassMark() > request.getTotalMarks()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pass mark cannot be greater than total marks.");
            }
        }
    }

    private String normalizeRequired(String value, String fieldLabel) {
        String normalized = normalizeNullable(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldLabel + " is required.");
        }
        return normalized;
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private AssessmentDto toDto(Assessment assessment) {
        SubjectAssignment subjectAssignment = assessment.getSubjectAssignment();
        Subject subject = subjectAssignment != null ? subjectAssignment.getSubject() : null;
        Teacher teacher = assessment.getTeacher();
        List<AssessmentMark> marks = assessment.getId() != null
                ? assessmentMarkRepository.findAllByAssessmentId(assessment.getId())
                : List.of();
        long markedCount = marks.stream().filter(mark -> mark.getScore() != null).count();
        double averageScore = marks.stream()
                .map(AssessmentMark::getScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        double averagePercentage = assessment.getTotalMarks() != null && assessment.getTotalMarks() > 0
                ? (averageScore / assessment.getTotalMarks()) * 100
                : 0.0;

        return AssessmentDto.builder()
                .id(assessment.getId())
                .createdAt(assessment.getCreatedAt())
                .updatedAt(assessment.getUpdatedAt())
                .createdById(assessment.getCreatedBy() != null ? assessment.getCreatedBy().getId() : null)
                .createdByName(assessment.getCreatedBy() != null ? assessment.getCreatedBy().getDisplayName() : null)
                .updatedById(assessment.getUpdatedBy() != null ? assessment.getUpdatedBy().getId() : null)
                .updatedByName(assessment.getUpdatedBy() != null ? assessment.getUpdatedBy().getDisplayName() : null)
                .schoolId(subject != null && subject.getSchool() != null ? subject.getSchool().getId() : null)
                .schoolName(subject != null && subject.getSchool() != null ? subject.getSchool().getName() : null)
                .subjectAssignmentId(subjectAssignment != null ? subjectAssignment.getId() : null)
                .subjectId(subject != null ? subject.getId() : null)
                .subjectCode(subject != null ? subject.getCode() : null)
                .subjectName(subject != null ? subject.getName() : null)
                .gradeId(subjectAssignment != null && subjectAssignment.getGrade() != null ? subjectAssignment.getGrade().getId() : null)
                .gradeName(subjectAssignment != null && subjectAssignment.getGrade() != null ? subjectAssignment.getGrade().getName() : null)
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherName(teacher != null && teacher.getUser() != null ? teacher.getUser().getDisplayName() : null)
                .title(assessment.getTitle())
                .description(assessment.getDescription())
                .type(assessment.getType())
                .status(assessment.getStatus())
                .assessmentDate(assessment.getAssessmentDate())
                .totalMarks(assessment.getTotalMarks())
                .passMark(assessment.getPassMark())
                .studentCount(subjectAssignment != null && subjectAssignment.getStudents() != null ? subjectAssignment.getStudents().size() : 0)
                .markedCount((int) markedCount)
                .averageScore(roundToTwoDecimals(averageScore))
                .averagePercentage(roundToTwoDecimals(averagePercentage))
                .build();
    }

    private AssessmentMarkDto toMarkDto(AssessmentMark mark, Assessment assessment, Student student) {
        Double score = mark != null ? mark.getScore() : null;
        Double totalMarks = assessment.getTotalMarks();
        Double percentage = score != null && totalMarks != null && totalMarks > 0
                ? roundToTwoDecimals((score / totalMarks) * 100)
                : null;
        Double passMark = assessment.getPassMark();
        Boolean passed = score != null && passMark != null ? score >= passMark : null;

        return AssessmentMarkDto.builder()
                .id(mark != null ? mark.getId() : null)
                .createdAt(mark != null ? mark.getCreatedAt() : null)
                .updatedAt(mark != null ? mark.getUpdatedAt() : null)
                .createdById(mark != null && mark.getCreatedBy() != null ? mark.getCreatedBy().getId() : null)
                .createdByName(mark != null && mark.getCreatedBy() != null ? mark.getCreatedBy().getDisplayName() : null)
                .updatedById(mark != null && mark.getUpdatedBy() != null ? mark.getUpdatedBy().getId() : null)
                .updatedByName(mark != null && mark.getUpdatedBy() != null ? mark.getUpdatedBy().getDisplayName() : null)
                .schoolId(student.getSchool() != null ? student.getSchool().getId() : null)
                .schoolName(student.getSchool() != null ? student.getSchool().getName() : null)
                .assessmentId(assessment.getId())
                .studentId(student.getId())
                .studentName(student.getUser() != null ? student.getUser().getDisplayName() : null)
                .studentNumber(student.getStudentNumber())
                .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                .score(score)
                .percentage(percentage)
                .passed(passed)
                .totalMarks(totalMarks)
                .passMark(passMark)
                .comment(mark != null ? mark.getComment() : null)
                .build();
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
