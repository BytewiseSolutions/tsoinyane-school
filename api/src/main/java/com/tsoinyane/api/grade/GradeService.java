package com.tsoinyane.api.grade;

import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.user.User;
import com.tsoinyane.api.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;

    public List<GradeDto> getAllGrades() {
        return gradeRepository.findAllWithSchoolOrderByIdAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public GradeDto createGrade(GradeDto request, Long actorUserId) {
        String name = normalizeName(request.getName());
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        User actor = resolveActor(actorUserId);

        Grade grade = Grade.builder()
                .name(name)
                .school(school)
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        return toDto(gradeRepository.save(grade));
    }

    public GradeDto updateGrade(Long id, GradeDto request, Long actorUserId) {
        Grade existingGrade = gradeRepository.findWithSchoolById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grade not found"));

        String name = normalizeName(request.getName());
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade name is required");
        }

        School school = resolveSchool(request.getSchoolId());
        User actor = resolveActor(actorUserId);

        existingGrade.setName(name);
        existingGrade.setSchool(school);
        existingGrade.setUpdatedBy(actor);

        return toDto(gradeRepository.save(existingGrade));
    }

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

    private User resolveActor(Long actorUserId) {
        if (actorUserId == null || actorUserId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Logged in user is required");
        }

        return userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid logged in user"));
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
