package com.tsoinyane.api.teacher;

import com.tsoinyane.api.common.Role;
import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.grade.GradeRepository;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final GradeRepository gradeRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<TeacherDto> getTeachers(Long schoolId) {
        return teacherRepository.findAllBySchoolId(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    public TeacherDto createTeacher(TeacherDto request) {
        User user = resolveTeacherUser(request.getUserId());
        School school = resolveSchool(request.getSchoolId());
        User actor = currentUserService.getCurrentUser();

        if (teacherRepository.findByUser_Id(user.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Teacher already exists for this user");
        }

        boolean belongsToSchool = user.getSchools().stream()
                .anyMatch(item -> item.getId() != null && item.getId().equals(school.getId()));
        if (!belongsToSchool) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected school does not belong to the teacher user");
        }

        Teacher teacher = Teacher.builder()
                .user(user)
                .school(school)
                .grades(resolveTeacherGrades(request.getGradeIds(), school.getId()))
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(teacherRepository.save(teacher));
    }

    private User resolveTeacherUser(Long userId) {
        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Teacher user is required");
        }

        User user = userRepository.findWithSchoolsAndRolesById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid userId: " + userId));

        if (user.getRoles() == null || !user.getRoles().contains(Role.TEACHER)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user is not a teacher");
        }

        return user;
    }

    private School resolveSchool(Long schoolId) {
        if (schoolId == null || schoolId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is required");
        }

        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid schoolId: " + schoolId));
    }

    private TeacherDto toDto(Teacher teacher) {
        User user = teacher.getUser();
        School school = teacher.getSchool();
        List<Grade> grades = teacher.getGrades().stream()
                .sorted(Comparator.comparing(Grade::getId))
                .toList();

        return TeacherDto.builder()
                .id(teacher.getId())
                .createdAt(teacher.getCreatedAt())
                .updatedAt(teacher.getUpdatedAt())
                .userId(user != null ? user.getId() : null)
                .userFullName(user != null ? user.getDisplayName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userPhone(user != null ? user.getPhone() : null)
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .gradeIds(grades.stream().map(Grade::getId).toList())
                .gradeNames(grades.stream().map(Grade::getName).toList())
                .createdById(teacher.getCreatedBy() != null ? teacher.getCreatedBy().getId() : null)
                .createdByName(teacher.getCreatedBy() != null ? teacher.getCreatedBy().getDisplayName() : null)
                .updatedById(teacher.getUpdatedBy() != null ? teacher.getUpdatedBy().getId() : null)
                .updatedByName(teacher.getUpdatedBy() != null ? teacher.getUpdatedBy().getDisplayName() : null)
                .build();
    }

    private Set<Grade> resolveTeacherGrades(List<Long> gradeIds, Long schoolId) {
        if (gradeIds == null || gradeIds.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<Long> uniqueGradeIds = gradeIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        List<Grade> grades = gradeRepository.findAllById(uniqueGradeIds);
        if (grades.size() != uniqueGradeIds.size()) {
            Set<Long> foundIds = grades.stream().map(Grade::getId).collect(java.util.stream.Collectors.toSet());
            List<Long> missingIds = uniqueGradeIds.stream().filter(id -> !foundIds.contains(id)).toList();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid gradeIds: " + missingIds);
        }

        List<Long> invalidGradeIds = grades.stream()
                .filter(grade -> grade.getSchool() == null || !grade.getSchool().getId().equals(schoolId))
                .map(Grade::getId)
                .toList();
        if (!invalidGradeIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected grades do not belong to the teacher's school: " + invalidGradeIds);
        }

        return new LinkedHashSet<>(grades);
    }
}
