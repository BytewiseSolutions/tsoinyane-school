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
        validateRequest(request, school.getId(), grade, null, academicYear);
        User actor = currentUserService.getCurrentUser();

        double registrationFee = normalizeRegistrationFee(request.getRegistrationFee(), request.getTerm());
        double foodFee = normalizeAmount(request.getFoodFee(), "Food fee");
        double booksFee = normalizeAmount(request.getBooksFee(), "Books fee");
        double generalFee = normalizeAmount(request.getGeneralFee(), "General fee");
        double schoolFee = calculateSchoolFee(foodFee, booksFee, generalFee);
        double examFee = normalizeExamFee(request.getExamFee(), grade, request.getTerm());

        FeeStructure feeStructure = FeeStructure.builder()
                .school(school)
                .grade(grade)
                .term(request.getTerm())
                .academicYear(academicYear)
                .registrationFee(registrationFee)
                .schoolFee(schoolFee)
                .foodFee(foodFee)
                .booksFee(booksFee)
                .generalFee(generalFee)
                .examFee(examFee)
                .amount(calculateTotalAmount(registrationFee, schoolFee, examFee))
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
        validateRequest(request, school.getId(), grade, id, academicYear);
        User actor = currentUserService.getCurrentUser();
        double registrationFee = normalizeRegistrationFee(request.getRegistrationFee(), request.getTerm());
        double foodFee = normalizeAmount(request.getFoodFee(), "Food fee");
        double booksFee = normalizeAmount(request.getBooksFee(), "Books fee");
        double generalFee = normalizeAmount(request.getGeneralFee(), "General fee");
        double schoolFee = calculateSchoolFee(foodFee, booksFee, generalFee);
        double examFee = normalizeExamFee(request.getExamFee(), grade, request.getTerm());

        existing.setSchool(school);
        existing.setGrade(grade);
        existing.setTerm(request.getTerm());
        existing.setAcademicYear(academicYear);
        existing.setRegistrationFee(registrationFee);
        existing.setSchoolFee(schoolFee);
        existing.setFoodFee(foodFee);
        existing.setBooksFee(booksFee);
        existing.setGeneralFee(generalFee);
        existing.setExamFee(examFee);
        existing.setAmount(calculateTotalAmount(registrationFee, schoolFee, examFee));
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

    private void validateRequest(FeeStructureDto request, Long schoolId, Grade grade, Long existingId, String academicYear) {
        if (request.getTerm() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Term is required");
        }

        normalizeRegistrationFee(request.getRegistrationFee(), request.getTerm());
        double foodFee = normalizeAmount(request.getFoodFee(), "Food fee");
        double booksFee = normalizeAmount(request.getBooksFee(), "Books fee");
        double generalFee = normalizeAmount(request.getGeneralFee(), "General fee");
        double expectedSchoolFee = calculateSchoolFee(foodFee, booksFee, generalFee);
        double requestSchoolFee = normalizeAmount(request.getSchoolFee(), "School fee");
        double examFee = normalizeExamFee(request.getExamFee(), grade, request.getTerm());

        if (Double.compare(expectedSchoolFee, requestSchoolFee) != 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "School fee must equal the sum of Food fee, Books fee, and General fee"
            );
        }

        feeStructureRepository.findBySchoolIdAndGradeIdAndTermAndAcademicYear(schoolId, grade.getId(), request.getTerm(), academicYear)
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

    private Double normalizeRegistrationFee(Double value, Term term) {
        double registrationFee = normalizeAmount(value, "Registration fee");

        if (term != Term.TERM_1) {
            if (registrationFee > 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Registration fee is a once-off annual charge and can only be set in Term 1"
                );
            }
            return 0.0;
        }

        return registrationFee;
    }

    private Double normalizeExamFee(Double value, Grade grade, Term term) {
        double examFee = normalizeAmount(value, "Exam fee");

        if (!isGrade11(grade)) {
            if (examFee > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam fee only applies to Grade 11");
            }
            return 0.0;
        }

        if (term != Term.TERM_2) {
            if (examFee > 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Exam fee for Grade 11 can only be set in Term 2"
                );
            }
            return 0.0;
        }

        return examFee;
    }

    private boolean isGrade11(Grade grade) {
        if (grade == null || grade.getName() == null) {
            return false;
        }

        String digitsOnly = grade.getName().replaceAll("[^0-9]", "");
        return "11".equals(digitsOnly);
    }

    private Double calculateSchoolFee(double foodFee, double booksFee, double generalFee) {
        return Math.round((foodFee + booksFee + generalFee) * 100.0) / 100.0;
    }

    private Double calculateTotalAmount(double registrationFee, double schoolFee, double examFee) {
        return Math.round((registrationFee + schoolFee + examFee) * 100.0) / 100.0;
    }

    private FeeStructureDto toDto(FeeStructure feeStructure) {
        School school = feeStructure.getSchool();
        Grade grade = feeStructure.getGrade();
        double registrationFee = feeStructure.getRegistrationFee() != null ? feeStructure.getRegistrationFee() : 0.0;
        double schoolFee = feeStructure.getSchoolFee() != null ? feeStructure.getSchoolFee() : 0.0;
        double foodFee = feeStructure.getFoodFee() != null ? feeStructure.getFoodFee() : 0.0;
        double booksFee = feeStructure.getBooksFee() != null ? feeStructure.getBooksFee() : 0.0;
        double generalFee = feeStructure.getGeneralFee() != null ? feeStructure.getGeneralFee() : 0.0;
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
                .foodFee(foodFee)
                .booksFee(booksFee)
                .generalFee(generalFee)
                .examFee(examFee)
                .description(feeStructure.getDescription())
                .totalAmount(registrationFee + schoolFee + examFee)
                .build();
    }
}
