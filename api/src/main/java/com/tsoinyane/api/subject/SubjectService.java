package com.tsoinyane.api.subject;

import com.tsoinyane.api.common.Status;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.grade.GradeRepository;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.teacher.Teacher;
import com.tsoinyane.api.teacher.TeacherRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final SchoolRepository schoolRepository;
    private final GradeRepository gradeRepository;
    private final TeacherRepository teacherRepository;
    private final CurrentUserService currentUserService;

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
        Grade grade = resolveGrade(request.getGradeId(), school.getId());
        Teacher teacher = resolveTeacher(request.getTeacherId(), school.getId());
        User actor = currentUserService.getCurrentUser();

        Subject subject = Subject.builder()
                .code(code)
                .name(name)
                .school(school)
                .grade(grade)
                .teacher(teacher)
                .status(request.getStatus() != null ? request.getStatus() : Status.ACTIVE)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(subjectRepository.save(subject));
    }

    private School resolveSchool(Long schoolId) {
        if (schoolId == null || schoolId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is required");
        }

        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid schoolId: " + schoolId));
    }

    private Grade resolveGrade(Long gradeId, Long schoolId) {
        if (gradeId == null || gradeId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade is required");
        }

        Grade grade = gradeRepository.findWithSchoolById(gradeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid gradeId: " + gradeId));

        if (grade.getSchool() == null || !grade.getSchool().getId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected grade does not belong to the selected school");
        }

        return grade;
    }

    private Teacher resolveTeacher(Long teacherId, Long schoolId) {
        if (teacherId == null || teacherId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher is required");
        }

        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid teacherId: " + teacherId));

        if (teacher.getSchool() == null || !teacher.getSchool().getId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected teacher does not belong to the selected school");
        }

        return teacher;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private SubjectDto toDto(Subject subject) {
        Grade grade = subject.getGrade();
        Teacher teacher = subject.getTeacher();

        return SubjectDto.builder()
                .id(subject.getId())
                .createdAt(subject.getCreatedAt())
                .updatedAt(subject.getUpdatedAt())
                .schoolId(subject.getSchool() != null ? subject.getSchool().getId() : null)
                .schoolName(subject.getSchool() != null ? subject.getSchool().getName() : null)
                .code(subject.getCode())
                .name(subject.getName())
                .gradeId(grade != null ? grade.getId() : null)
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherName(teacher != null && teacher.getUser() != null ? teacher.getUser().getDisplayName() : null)
                .status(subject.getStatus())
                .createdById(subject.getCreatedBy() != null ? subject.getCreatedBy().getId() : null)
                .createdByName(subject.getCreatedBy() != null ? subject.getCreatedBy().getDisplayName() : null)
                .updatedById(subject.getUpdatedBy() != null ? subject.getUpdatedBy().getId() : null)
                .updatedByName(subject.getUpdatedBy() != null ? subject.getUpdatedBy().getDisplayName() : null)
                .build();
    }
}
