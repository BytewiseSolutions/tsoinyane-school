package com.tsoinyane.api.grade;

import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final SchoolRepository schoolRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<GradeDto> getAllGrades() {
        return gradeRepository.findAllWithSchoolOrderByIdAsc().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public GradeDto createGrade(GradeDto request) {
        String name = normalizeName(request.getName());
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        User actor = currentUserService.getCurrentUser();

        Grade grade = Grade.builder()
                .name(name)
                .school(school)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        Grade saved = gradeRepository.save(grade);
        return toDto(gradeRepository.findWithSchoolById(saved.getId())
                .orElse(saved));
    }

    @Transactional
    public GradeDto updateGrade(Long id, GradeDto request) {
        Grade existingGrade = gradeRepository.findWithSchoolById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grade not found"));

        String name = normalizeName(request.getName());
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        User actor = currentUserService.getCurrentUser();

        existingGrade.setName(name);
        existingGrade.setSchool(school);
        existingGrade.setUpdatedBy(actor);

        gradeRepository.save(existingGrade);
        return toDto(gradeRepository.findWithSchoolById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grade not found")));
    }

    @Transactional
    public void deleteGrade(Long id) {
        Grade existingGrade = gradeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grade not found"));
        gradeRepository.delete(existingGrade);
    }

    private School resolveSchool(Long schoolId) {
        if (schoolId == null || schoolId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "School is required");
        }

        return schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid schoolId: " + schoolId));
    }

    private String normalizeName(String name) {
        return name == null ? "" : name.trim();
    }

    private GradeDto toDto(Grade grade) {
        School school = grade.getSchool();

        return GradeDto.builder()
                .id(grade.getId())
                .createdAt(grade.getCreatedAt())
                .updatedAt(grade.getUpdatedAt())
                .name(grade.getName())
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .createdById(grade.getCreatedBy() != null ? grade.getCreatedBy().getId() : null)
                .createdByName(grade.getCreatedBy() != null ? grade.getCreatedBy().getDisplayName() : null)
                .updatedById(grade.getUpdatedBy() != null ? grade.getUpdatedBy().getId() : null)
                .updatedByName(grade.getUpdatedBy() != null ? grade.getUpdatedBy().getDisplayName() : null)
                .build();
    }
}
