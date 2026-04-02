package com.tsoinyane.api.fee;

import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.grade.GradeRepository;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.school.Term;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeeStructureService {

    private final FeeStructureRepository feeStructureRepository;
    private final SchoolRepository schoolRepository;
    private final GradeRepository gradeRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<FeeStructureDto> getFeeStructures(Long schoolId) {
        return feeStructureRepository.findAllWithAssociations(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeeStructureDto getFeeStructure(Long id) {
        return feeStructureRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));
    }

    @Transactional
    public FeeStructureDto createFeeStructure(FeeStructureDto request) {
        School school = resolveSchool(request.getSchoolId());
        Grade grade = resolveGrade(request.getGradeId(), school.getId());
        String academicYear = normalizeAcademicYear(request.getAcademicYear());
        validateRequest(request, school.getId(), grade.getId(), null, academicYear);
        User actor = currentUserService.getCurrentUser();

        FeeStructure feeStructure = FeeStructure.builder()
                .school(school)
                .grade(grade)
                .term(request.getTerm())
                .academicYear(academicYear)
                .registrationFee(normalizeAmount(request.getRegistrationFee(), "Registration fee"))
                .schoolFee(normalizeAmount(request.getSchoolFee(), "School fee"))
                .examFee(normalizeAmount(request.getExamFee(), "Exam fee"))
                .description(normalizeDescription(request.getDescription()))
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        FeeStructure saved = feeStructureRepository.save(feeStructure);
        return toDto(feeStructureRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public FeeStructureDto updateFeeStructure(Long id, FeeStructureDto request) {
        FeeStructure existing = feeStructureRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));

        School school = resolveSchool(request.getSchoolId());
        Grade grade = resolveGrade(request.getGradeId(), school.getId());
        String academicYear = normalizeAcademicYear(request.getAcademicYear());
        validateRequest(request, school.getId(), grade.getId(), id, academicYear);
        User actor = currentUserService.getCurrentUser();

        existing.setSchool(school);
        existing.setGrade(grade);
        existing.setTerm(request.getTerm());
        existing.setAcademicYear(academicYear);
        existing.setRegistrationFee(normalizeAmount(request.getRegistrationFee(), "Registration fee"));
        existing.setSchoolFee(normalizeAmount(request.getSchoolFee(), "School fee"));
        existing.setExamFee(normalizeAmount(request.getExamFee(), "Exam fee"));
        existing.setDescription(normalizeDescription(request.getDescription()));
        existing.setUpdatedBy(actor);

        FeeStructure saved = feeStructureRepository.save(existing);
        return toDto(feeStructureRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public void deleteFeeStructure(Long id) {
        FeeStructure existing = feeStructureRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));
        feeStructureRepository.delete(existing);
    }

    private void validateRequest(FeeStructureDto request, Long schoolId, Long gradeId, Long existingId, String academicYear) {
        if (request.getTerm() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Term is required");
        }

        normalizeAmount(request.getRegistrationFee(), "Registration fee");
        normalizeAmount(request.getSchoolFee(), "School fee");
        normalizeAmount(request.getExamFee(), "Exam fee");

        feeStructureRepository.findBySchoolIdAndGradeIdAndTermAndAcademicYear(schoolId, gradeId, request.getTerm(), academicYear)
                .ifPresent(existing -> {
                    if (existingId == null || !existing.getId().equals(existingId)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "A fee structure already exists for this grade, term, and academic year"
                        );
                    }
                });
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

        Grade grade = gradeRepository.findById(gradeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid gradeId: " + gradeId));
        if (grade.getSchool() == null || !grade.getSchool().getId().equals(schoolId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grade does not belong to the selected school");
        }

        return grade;
    }

    private String normalizeAcademicYear(String value) {
        String academicYear = value == null ? "" : value.trim();
        if (academicYear.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Academic year is required");
        }

        return academicYear;
    }

    private String normalizeDescription(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Double normalizeAmount(Double value, String label) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is required");
        }

        if (value < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " cannot be negative");
        }

        return Math.round(value * 100.0) / 100.0;
    }

    private FeeStructureDto toDto(FeeStructure feeStructure) {
        School school = feeStructure.getSchool();
        Grade grade = feeStructure.getGrade();
        double registrationFee = feeStructure.getRegistrationFee() != null ? feeStructure.getRegistrationFee() : 0.0;
        double schoolFee = feeStructure.getSchoolFee() != null ? feeStructure.getSchoolFee() : 0.0;
        double examFee = feeStructure.getExamFee() != null ? feeStructure.getExamFee() : 0.0;

        return FeeStructureDto.builder()
                .id(feeStructure.getId())
                .createdAt(feeStructure.getCreatedAt())
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .gradeId(grade != null ? grade.getId() : null)
                .gradeName(grade != null ? grade.getName() : null)
                .term(feeStructure.getTerm())
                .academicYear(feeStructure.getAcademicYear())
                .registrationFee(registrationFee)
                .schoolFee(schoolFee)
                .examFee(examFee)
                .description(feeStructure.getDescription())
                .totalAmount(registrationFee + schoolFee + examFee)
                .build();
    }
}
