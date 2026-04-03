package com.tsoinyane.api.fee;

import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeePaymentService {

    private final FeePaymentRepository feePaymentRepository;
    private final StudentRepository studentRepository;
    private final FeeStructureRepository feeStructureRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<FeePaymentDto> getFeePayments(Long schoolId) {
        return feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeePaymentDto getFeePayment(Long id) {
        return feePaymentRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));
    }

    @Transactional
    public FeePaymentDto createFeePayment(FeePaymentDto request) {
        Student student = resolveStudent(request.getStudentId());
        FeeStructure feeStructure = resolveFeeStructure(request.getFeeStructureId());
        validateStudentAndFeeStructure(student, feeStructure);
        double amount = normalizeAmount(request.getAmount());
        User actor = currentUserService.getCurrentUser();

        validatePaymentAmount(student.getId(), feeStructure, amount, null);

        FeePayment feePayment = FeePayment.builder()
                .student(student)
                .feeStructure(feeStructure)
                .amount(amount)
                .paymentDate(request.getPaymentDate())
                .paymentMethod(normalizePaymentMethod(request.getPaymentMethod()))
                .referenceNumber(normalizeOptionalText(request.getReferenceNumber()))
                .notes(normalizeOptionalText(request.getNotes()))
                .createdBy(actor)
                .updatedBy(actor)
                .build();

        FeePayment saved = feePaymentRepository.save(feePayment);
        return toDto(feePaymentRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public FeePaymentDto updateFeePayment(Long id, FeePaymentDto request) {
        FeePayment existing = feePaymentRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));

        Student student = resolveStudent(request.getStudentId());
        FeeStructure feeStructure = resolveFeeStructure(request.getFeeStructureId());
        validateStudentAndFeeStructure(student, feeStructure);
        double amount = normalizeAmount(request.getAmount());
        User actor = currentUserService.getCurrentUser();

        validatePaymentAmount(student.getId(), feeStructure, amount, existing.getId());

        existing.setStudent(student);
        existing.setFeeStructure(feeStructure);
        existing.setAmount(amount);
        existing.setPaymentDate(request.getPaymentDate());
        existing.setPaymentMethod(normalizePaymentMethod(request.getPaymentMethod()));
        existing.setReferenceNumber(normalizeOptionalText(request.getReferenceNumber()));
        existing.setNotes(normalizeOptionalText(request.getNotes()));
        existing.setUpdatedBy(actor);

        FeePayment saved = feePaymentRepository.save(existing);
        return toDto(feePaymentRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public void deleteFeePayment(Long id) {
        FeePayment existing = feePaymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));
        feePaymentRepository.delete(existing);
    }

    private Student resolveStudent(Long studentId) {
        if (studentId == null || studentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student is required");
        }

        return studentRepository.findWithAssociationsById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid studentId: " + studentId));
    }

    private FeeStructure resolveFeeStructure(Long feeStructureId) {
        if (feeStructureId == null || feeStructureId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fee structure is required");
        }

        return feeStructureRepository.findWithAssociationsById(feeStructureId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid feeStructureId: " + feeStructureId));
    }

    private void validateStudentAndFeeStructure(Student student, FeeStructure feeStructure) {
        School studentSchool = student.getSchool();
        School feeSchool = feeStructure.getSchool();
        Grade studentGrade = student.getGrade();
        Grade feeGrade = feeStructure.getGrade();

        if (studentSchool == null || feeSchool == null || !studentSchool.getId().equals(feeSchool.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student and fee structure must belong to the same school");
        }

        if (studentGrade == null || feeGrade == null || !studentGrade.getId().equals(feeGrade.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student grade does not match the selected fee structure");
        }
    }

    private void validatePaymentAmount(Long studentId, FeeStructure feeStructure, double amount, Long paymentIdToExclude) {
        double totalFee = resolveTotalFee(feeStructure);
        double totalPaid = paymentIdToExclude == null
                ? coalesceAmount(feePaymentRepository.sumPaidAmount(studentId, feeStructure.getId()))
                : coalesceAmount(feePaymentRepository.sumPaidAmountExcludingPayment(studentId, feeStructure.getId(), paymentIdToExclude));

        if ((totalPaid + amount) - totalFee > 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment exceeds the outstanding balance for this fee record");
        }
    }

    private double resolveTotalFee(FeeStructure feeStructure) {
        if (feeStructure.getAmount() != null && feeStructure.getAmount() > 0) {
            return roundAmount(feeStructure.getAmount());
        }

        return roundAmount(
                coalesceAmount(feeStructure.getRegistrationFee())
                        + coalesceAmount(feeStructure.getSchoolFee())
                        + coalesceAmount(feeStructure.getExamFee())
        );
    }

    private FeePaymentDto toDto(FeePayment feePayment) {
        Student student = feePayment.getStudent();
        FeeStructure feeStructure = feePayment.getFeeStructure();
        double totalFee = resolveTotalFee(feeStructure);
        double totalPaid = coalesceAmount(feePaymentRepository.sumPaidAmount(student.getId(), feeStructure.getId()));

        return FeePaymentDto.builder()
                .id(feePayment.getId())
                .createdAt(feePayment.getCreatedAt())
                .schoolId(student.getSchool() != null ? student.getSchool().getId() : null)
                .studentId(student.getId())
                .studentName(resolveStudentName(student))
                .studentNumber(student.getStudentNumber())
                .feeStructureId(feeStructure.getId())
                .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                .term(feeStructure.getTerm() != null ? feeStructure.getTerm().name() : null)
                .academicYear(feeStructure.getAcademicYear())
                .amount(coalesceAmount(feePayment.getAmount()))
                .paymentDate(feePayment.getPaymentDate())
                .paymentMethod(feePayment.getPaymentMethod())
                .referenceNumber(feePayment.getReferenceNumber())
                .notes(feePayment.getNotes())
                .totalFee(totalFee)
                .totalPaid(totalPaid)
                .balance(roundAmount(totalFee - totalPaid))
                .build();
    }

    private String resolveStudentName(Student student) {
        if (student.getUser() == null) {
            return null;
        }

        String firstName = student.getUser().getFirstName() != null ? student.getUser().getFirstName().trim() : "";
        String lastName = student.getUser().getLastName() != null ? student.getUser().getLastName().trim() : "";
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? null : fullName;
    }

    private PaymentMethod normalizePaymentMethod(PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method is required");
        }

        return paymentMethod;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private double normalizeAmount(Double value) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount is required");
        }

        if (value <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
        }

        return roundAmount(value);
    }

    private double coalesceAmount(Double value) {
        return roundAmount(value != null ? value : 0.0);
    }

    private double roundAmount(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
