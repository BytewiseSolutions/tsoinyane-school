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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeeStructureService {

    private final FeeStructureRepository feeStructureRepository;
    private final FeeTermWindowRepository feeTermWindowRepository;
    private final SchoolRepository schoolRepository;
    private final GradeRepository gradeRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<FeeStructureDto> getFeeStructures(Long schoolId) {
        List<FeeStructure> structures = feeStructureRepository.findAllWithAssociations(schoolId);
        Map<String, FeeTermWindow> windowsByKey = feeTermWindowRepository.findAllWithSchool(schoolId).stream()
                .collect(Collectors.toMap(this::toWindowKey, Function.identity(), (left, right) -> left));

        return structures.stream()
                .map(structure -> toDto(structure, windowsByKey.get(toWindowKey(structure))))
                .toList();
    }

    @Transactional(readOnly = true)
    public FeeStructureDto getFeeStructure(Long id) {
        return feeStructureRepository.findWithAssociationsById(id)
                .map(feeStructure -> toDto(feeStructure, resolveTermWindow(feeStructure)))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));
    }

    @Transactional
    public FeeStructureDto createFeeStructure(FeeStructureDto request) {
        School school = resolveSchool(request.getSchoolId());
        Grade grade = resolveGrade(request.getGradeId(), school.getId());
        String academicYear = normalizeAcademicYear(request.getAcademicYear());
        FeeType feeType = normalizeFeeType(request.getFeeType());
        double amount = normalizeAmount(request.getAmount(), "Amount");
        validateRequest(request, grade, feeType, amount);
        User actor = currentUserService.getCurrentUser();

        FeeStructure feeStructure = feeStructureRepository
                .findBySchoolIdAndGradeIdAndTermAndAcademicYear(school.getId(), grade.getId(), request.getTerm(), academicYear)
                .orElseGet(() -> FeeStructure.builder()
                        .school(school)
                        .grade(grade)
                        .term(request.getTerm())
                        .academicYear(academicYear)
                        .registrationFee(0.0)
                        .schoolFee(0.0)
                        .examFee(0.0)
                        .amount(0.0)
                        .createdBy(actor)
                        .updatedBy(actor)
                        .build());

        feeStructure.setSchool(school);
        feeStructure.setGrade(grade);
        feeStructure.setTerm(request.getTerm());
        feeStructure.setAcademicYear(academicYear);
        applyFeeType(feeStructure, feeType, amount, grade, request.getTerm());
        feeStructure.setAmount(calculateTotalAmount(feeStructure.getRegistrationFee(), feeStructure.getSchoolFee(), feeStructure.getExamFee()));
        feeStructure.setUpdatedBy(actor);

        FeeStructure saved = feeStructureRepository.save(feeStructure);
        FeeTermWindow termWindow = saveTermWindowIfRequested(school, request.getTerm(), academicYear, request, actor);
        return toDto(feeStructureRepository.findWithAssociationsById(saved.getId()).orElse(saved), termWindow);
    }

    @Transactional
    public FeeStructureDto updateFeeStructure(Long id, FeeStructureDto request) {
        FeeStructure existing = feeStructureRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));

        School school = resolveSchool(request.getSchoolId());
        Grade grade = resolveGrade(request.getGradeId(), school.getId());
        String academicYear = normalizeAcademicYear(request.getAcademicYear());
        FeeType feeType = normalizeFeeType(request.getFeeType());
        double amount = normalizeAmount(request.getAmount(), "Amount");
        validateRequest(request, grade, feeType, amount);
        User actor = currentUserService.getCurrentUser();

        existing.setSchool(school);
        existing.setGrade(grade);
        existing.setTerm(request.getTerm());
        existing.setAcademicYear(academicYear);
        applyFeeType(existing, feeType, amount, grade, request.getTerm());
        existing.setAmount(calculateTotalAmount(existing.getRegistrationFee(), existing.getSchoolFee(), existing.getExamFee()));
        existing.setUpdatedBy(actor);

        FeeStructure saved = feeStructureRepository.save(existing);
        FeeTermWindow termWindow = saveTermWindowIfRequested(school, request.getTerm(), academicYear, request, actor);
        return toDto(feeStructureRepository.findWithAssociationsById(saved.getId()).orElse(saved), termWindow);
    }

    @Transactional
    public void deleteFeeStructure(Long id) {
        FeeStructure existing = feeStructureRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee structure not found"));
        feeStructureRepository.delete(existing);
    }

    private void validateRequest(FeeStructureDto request, Grade grade, FeeType feeType, double amount) {
        if (request.getTerm() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Term is required");
        }

        switch (feeType) {
            case REGISTRATION_FEE -> normalizeRegistrationFee(amount, request.getTerm());
            case SCHOOL_FEES -> normalizeSchoolFee(amount);
            case EXAM_FEE -> normalizeExamFee(amount, grade, request.getTerm());
        }
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

    private FeeType normalizeFeeType(FeeType value) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fee type is required");
        }

        return value;
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

    private Double normalizeRegistrationFee(double value, Term term) {
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

    private Double normalizeSchoolFee(double value) {
        return normalizeAmount(value, "School fee");
    }

    private Double normalizeExamFee(double value, Grade grade, Term term) {
        double examFee = normalizeAmount(value, "Exam fee");

        if (!isGrade11(grade)) {
            if (examFee > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exam fee only applies to Grade 11");
            }
            return 0.0;
        }

        return examFee;
    }

    private void applyFeeType(FeeStructure feeStructure, FeeType feeType, double amount, Grade grade, Term term) {
        switch (feeType) {
            case REGISTRATION_FEE -> feeStructure.setRegistrationFee(normalizeRegistrationFee(amount, term));
            case SCHOOL_FEES -> feeStructure.setSchoolFee(normalizeSchoolFee(amount));
            case EXAM_FEE -> feeStructure.setExamFee(normalizeExamFee(amount, grade, term));
        }
    }

    private FeeTermWindow saveTermWindowIfRequested(
            School school,
            Term term,
            String academicYear,
            FeeStructureDto request,
            User actor
    ) {
        if (!Boolean.TRUE.equals(request.getUpdateTermDates())) {
            return feeTermWindowRepository.findBySchoolIdAndTermAndAcademicYear(school.getId(), term, academicYear).orElse(null);
        }

        LocalDate openingDate = request.getTermOpeningDate();
        LocalDate closingDate = request.getTermClosingDate();
        validateTermDates(openingDate, closingDate);

        FeeTermWindow termWindow = feeTermWindowRepository.findBySchoolIdAndTermAndAcademicYear(school.getId(), term, academicYear)
                .orElseGet(() -> FeeTermWindow.builder()
                        .school(school)
                        .term(term)
                        .academicYear(academicYear)
                        .createdBy(actor)
                        .updatedBy(actor)
                        .build());

        termWindow.setSchool(school);
        termWindow.setTerm(term);
        termWindow.setAcademicYear(academicYear);
        termWindow.setOpeningDate(openingDate);
        termWindow.setClosingDate(closingDate);
        termWindow.setUpdatedBy(actor);

        return feeTermWindowRepository.save(termWindow);
    }

    private void validateTermDates(LocalDate openingDate, LocalDate closingDate) {
        if (openingDate != null && closingDate != null && openingDate.isAfter(closingDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Opening date cannot be after closing date");
        }
    }

    private boolean isGrade11(Grade grade) {
        if (grade == null || grade.getName() == null) {
            return false;
        }

        String digitsOnly = grade.getName().replaceAll("[^0-9]", "");
        return "11".equals(digitsOnly);
    }

    private Double calculateTotalAmount(double registrationFee, double schoolFee, double examFee) {
        return Math.round((registrationFee + schoolFee + examFee) * 100.0) / 100.0;
    }

    private FeeStructureDto toDto(FeeStructure feeStructure, FeeTermWindow termWindow) {
        School school = feeStructure.getSchool();
        Grade grade = feeStructure.getGrade();
        double registrationFee = feeStructure.getRegistrationFee() != null ? feeStructure.getRegistrationFee() : 0.0;
        double schoolFee = feeStructure.getSchoolFee() != null ? feeStructure.getSchoolFee() : 0.0;
        double examFee = feeStructure.getExamFee() != null ? feeStructure.getExamFee() : 0.0;
        double amount = feeStructure.getAmount() != null ? feeStructure.getAmount() : 0.0;

        return FeeStructureDto.builder()
                .id(feeStructure.getId())
                .createdAt(feeStructure.getCreatedAt())
                .schoolId(school != null ? school.getId() : null)
                .schoolName(school != null ? school.getName() : null)
                .gradeId(grade != null ? grade.getId() : null)
                .gradeName(grade != null ? grade.getName() : null)
                .term(feeStructure.getTerm())
                .academicYear(feeStructure.getAcademicYear())
                .feeType(resolveFeeType(feeStructure))
                .registrationFee(registrationFee)
                .schoolFee(schoolFee)
                .examFee(examFee)
                .amount(amount)
                .termOpeningDate(termWindow != null ? termWindow.getOpeningDate() : null)
                .termClosingDate(termWindow != null ? termWindow.getClosingDate() : null)
                .updateTermDates(false)
                .totalAmount(registrationFee + schoolFee + examFee)
                .build();
    }

    private FeeTermWindow resolveTermWindow(FeeStructure feeStructure) {
        if (feeStructure.getSchool() == null || feeStructure.getSchool().getId() == null || feeStructure.getTerm() == null || feeStructure.getAcademicYear() == null) {
            return null;
        }

        return feeTermWindowRepository
                .findBySchoolIdAndTermAndAcademicYear(feeStructure.getSchool().getId(), feeStructure.getTerm(), feeStructure.getAcademicYear())
                .orElse(null);
    }

    private String toWindowKey(FeeStructure feeStructure) {
        return toWindowKey(
                feeStructure.getSchool() != null ? feeStructure.getSchool().getId() : null,
                feeStructure.getTerm(),
                feeStructure.getAcademicYear()
        );
    }

    private String toWindowKey(FeeTermWindow termWindow) {
        return toWindowKey(
                termWindow.getSchool() != null ? termWindow.getSchool().getId() : null,
                termWindow.getTerm(),
                termWindow.getAcademicYear()
        );
    }

    private String toWindowKey(Long schoolId, Term term, String academicYear) {
        return (schoolId != null ? schoolId : 0L) + "|" + (term != null ? term.name() : "") + "|" + (academicYear != null ? academicYear : "");
    }

    private FeeType resolveFeeType(FeeStructure feeStructure) {
        if (feeStructure.getExamFee() != null && feeStructure.getExamFee() > 0) {
            return FeeType.EXAM_FEE;
        }

        if (feeStructure.getRegistrationFee() != null && feeStructure.getRegistrationFee() > 0) {
            return FeeType.REGISTRATION_FEE;
        }

        return FeeType.SCHOOL_FEES;
    }
}
