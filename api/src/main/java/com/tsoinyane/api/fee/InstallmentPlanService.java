package com.tsoinyane.api.fee;

import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstallmentPlanService {

    private final InstallmentPlanRepository installmentPlanRepository;
    private final StudentRepository studentRepository;
    private final FeeStructureRepository feeStructureRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<InstallmentPlanDto> getInstallmentPlans(Long schoolId) {
        if (schoolId == null) {
            return List.of();
        }

        return installmentPlanRepository.findAllWithAssociationsBySchoolId(schoolId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InstallmentPlanDto getInstallmentPlan(Long id) {
        return installmentPlanRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment plan not found"));
    }

    @Transactional
    public InstallmentPlanDto createInstallmentPlan(InstallmentPlanDto request) {
        Student student = studentRepository.findWithAssociationsById(request.getStudentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student not found"));

        FeeStructure feeStructure = feeStructureRepository.findWithAssociationsById(request.getFeeStructureId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fee structure not found"));

        validateStudentAndFeeStructure(student, feeStructure);
        validateNoOtherActivePlan(student.getId(), feeStructure.getId(), null);

        User actor = currentUserService.getCurrentUser();
        double requestedTotalAmount = normalizeAmount(request.getTotalAmount(), "Total amount is required");
        double outstandingBalance = resolveOutstandingBalance(student.getId(), feeStructure);
        if (outstandingBalance <= 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This fee record has no outstanding balance left");
        }
        if (requestedTotalAmount - outstandingBalance > 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Installment total cannot be greater than the outstanding balance");
        }

        InstallmentPlan plan = InstallmentPlan.builder()
                .student(student)
                .feeStructure(feeStructure)
                .totalAmount(requestedTotalAmount)
                .status(InstallmentPlanStatus.ACTIVE)
                .createdBy(actor)
                .updatedBy(actor)
                .build();
        plan.setInstallments(buildSchedules(plan, request.getInstallments(), false));
        plan.setTotalAmount(sumScheduleAmounts(plan.getInstallments()));

        InstallmentPlan saved = installmentPlanRepository.save(plan);
        return toDto(installmentPlanRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public InstallmentPlanDto updateInstallmentPlan(Long id, InstallmentPlanDto request) {
        InstallmentPlan existing = installmentPlanRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment plan not found"));

        if (hasRecordedPayments(existing)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plans with recorded installment payments cannot be restructured");
        }

        User actor = currentUserService.getCurrentUser();

        List<InstallmentSchedule> schedules = buildSchedules(existing, request.getInstallments(), false);
        double totalAmount = sumScheduleAmounts(schedules);
        double outstandingBalance = resolveOutstandingBalance(existing.getStudent().getId(), existing.getFeeStructure());
        if (totalAmount - outstandingBalance > 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Installment total cannot be greater than the outstanding balance");
        }

        existing.getInstallments().clear();
        existing.getInstallments().addAll(schedules);
        existing.setTotalAmount(totalAmount);
        existing.setStatus(resolvePlanStatus(existing.getStatus(), existing.getInstallments()));
        existing.setUpdatedBy(actor);

        InstallmentPlan saved = installmentPlanRepository.save(existing);
        return toDto(installmentPlanRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public InstallmentPlanDto cancelInstallmentPlan(Long id) {
        InstallmentPlan existing = installmentPlanRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment plan not found"));

        if (existing.getStatus() == InstallmentPlanStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan is already cancelled");
        }

        User actor = currentUserService.getCurrentUser();
        existing.setStatus(InstallmentPlanStatus.CANCELLED);
        existing.setUpdatedBy(actor);

        InstallmentPlan saved = installmentPlanRepository.save(existing);
        return toDto(installmentPlanRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public InstallmentPlanDto recordInstallmentPayment(Long id, InstallmentPaymentRequest request) {
        InstallmentPlan plan = installmentPlanRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment plan not found"));

        if (plan.getStatus() != InstallmentPlanStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only active installment plans can accept payments");
        }

        InstallmentSchedule schedule = plan.getInstallments().stream()
                .filter(item -> item.getId() != null && item.getId().equals(request.getInstallmentId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Installment schedule not found"));

        double amount = normalizeAmount(request.getAmount(), "Amount is required");
        double remainingAmount = roundAmount(schedule.getAmount() - coalesceAmount(schedule.getPaidAmount()));
        if (remainingAmount <= 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This installment is already fully paid");
        }
        if (amount - remainingAmount > 0.009) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment exceeds the remaining installment balance");
        }

        User actor = currentUserService.getCurrentUser();

        FeePayment payment = FeePayment.builder()
                .student(plan.getStudent())
                .feeStructure(plan.getFeeStructure())
                .amount(amount)
                .paymentDate(request.getPaymentDate())
                .paymentMethod(request.getPaymentMethod())
                .referenceNumber(normalizeOptionalText(request.getReferenceNumber()))
                .notes(buildInstallmentPaymentNotes(schedule, request.getNotes()))
                .createdBy(actor)
                .updatedBy(actor)
                .reversed(false)
                .build();
        feePaymentRepository.save(payment);

        schedule.setPaidAmount(roundAmount(coalesceAmount(schedule.getPaidAmount()) + amount));
        if (schedule.getPaidAmount() >= schedule.getAmount() - 0.009) {
            schedule.setPaidAmount(roundAmount(schedule.getAmount()));
            schedule.setPaidDate(request.getPaymentDate());
            schedule.setStatus(InstallmentScheduleStatus.PAID);
        } else {
            schedule.setPaidDate(null);
            schedule.setStatus(determineScheduleStatus(schedule));
        }

        plan.getInstallments().forEach(item -> item.setStatus(determineScheduleStatus(item)));
        plan.setStatus(resolvePlanStatus(plan.getStatus(), plan.getInstallments()));
        plan.setUpdatedBy(actor);

        InstallmentPlan saved = installmentPlanRepository.save(plan);
        return toDto(installmentPlanRepository.findWithAssociationsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public void deleteInstallmentPlan(Long id) {
        InstallmentPlan existing = installmentPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Installment plan not found"));
        installmentPlanRepository.delete(existing);
    }

    private InstallmentPlanDto toDto(InstallmentPlan plan) {
        Student student = plan.getStudent();
        FeeStructure feeStructure = plan.getFeeStructure();

        List<InstallmentScheduleDto> installmentDtos = plan.getInstallments() != null
                ? plan.getInstallments().stream()
                    .sorted(Comparator.comparing(InstallmentSchedule::getInstallmentNumber))
                    .map(this::toScheduleDto)
                    .collect(Collectors.toList())
                : List.of();

        return InstallmentPlanDto.builder()
                .id(plan.getId())
                .studentId(student.getId())
                .studentName(resolveStudentName(student))
                .studentNumber(student.getStudentNumber())
                .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                .feeStructureId(feeStructure.getId())
                .term(feeStructure.getTerm() != null ? feeStructure.getTerm().name() : null)
                .academicYear(feeStructure.getAcademicYear())
                .totalAmount(plan.getTotalAmount())
                .status(plan.getStatus())
                .installments(installmentDtos)
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }

    private InstallmentScheduleDto toScheduleDto(InstallmentSchedule schedule) {
        return InstallmentScheduleDto.builder()
                .id(schedule.getId())
                .installmentNumber(schedule.getInstallmentNumber())
                .dueDate(schedule.getDueDate())
                .amount(schedule.getAmount())
                .paidAmount(schedule.getPaidAmount())
                .paidDate(schedule.getPaidDate())
                .status(determineScheduleStatus(schedule))
                .build();
    }

    private InstallmentScheduleStatus determineScheduleStatus(InstallmentSchedule schedule) {
        if (coalesceAmount(schedule.getPaidAmount()) >= coalesceAmount(schedule.getAmount()) - 0.009) {
            return InstallmentScheduleStatus.PAID;
        }
        if (schedule.getDueDate().isBefore(LocalDate.now())) {
            return InstallmentScheduleStatus.OVERDUE;
        }
        return InstallmentScheduleStatus.PENDING;
    }

    private List<InstallmentSchedule> buildSchedules(
            InstallmentPlan plan,
            List<InstallmentScheduleDto> requestSchedules,
            boolean preservePayments
    ) {
        if (requestSchedules == null || requestSchedules.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one installment is required");
        }

        List<InstallmentScheduleDto> sortedSchedules = requestSchedules.stream()
                .sorted(Comparator.comparing(
                        schedule -> schedule.getInstallmentNumber() != null ? schedule.getInstallmentNumber() : Integer.MAX_VALUE
                ))
                .toList();

        List<InstallmentSchedule> schedules = new ArrayList<>();

        for (int index = 0; index < sortedSchedules.size(); index++) {
            InstallmentScheduleDto scheduleDto = sortedSchedules.get(index);
            if (scheduleDto.getDueDate() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each installment must have a due date");
            }

            double amount = normalizeAmount(scheduleDto.getAmount(), "Each installment amount is required");
            double paidAmount = preservePayments ? coalesceAmount(scheduleDto.getPaidAmount()) : 0.0;
            if (paidAmount - amount > 0.009) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Installment amount cannot be less than the paid amount");
            }

            InstallmentSchedule schedule = InstallmentSchedule.builder()
                    .id(preservePayments ? scheduleDto.getId() : null)
                    .installmentPlan(plan)
                    .installmentNumber(index + 1)
                    .dueDate(scheduleDto.getDueDate())
                    .amount(roundAmount(amount))
                    .paidAmount(roundAmount(paidAmount))
                    .paidDate(preservePayments ? scheduleDto.getPaidDate() : null)
                    .status(InstallmentScheduleStatus.PENDING)
                    .build();
            schedule.setStatus(determineScheduleStatus(schedule));
            schedules.add(schedule);
        }

        return schedules;
    }

    private InstallmentPlanStatus resolvePlanStatus(InstallmentPlanStatus currentStatus, List<InstallmentSchedule> schedules) {
        if (currentStatus == InstallmentPlanStatus.CANCELLED) {
            return InstallmentPlanStatus.CANCELLED;
        }

        boolean allPaid = schedules.stream().allMatch(schedule -> determineScheduleStatus(schedule) == InstallmentScheduleStatus.PAID);
        return allPaid ? InstallmentPlanStatus.COMPLETED : InstallmentPlanStatus.ACTIVE;
    }

    private void validateStudentAndFeeStructure(Student student, FeeStructure feeStructure) {
        if (student.getSchool() == null || feeStructure.getSchool() == null
                || !student.getSchool().getId().equals(feeStructure.getSchool().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student and fee structure must belong to the same school");
        }

        if (student.getGrade() == null || feeStructure.getGrade() == null
                || !student.getGrade().getId().equals(feeStructure.getGrade().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student grade does not match the selected fee structure");
        }
    }

    private void validateNoOtherActivePlan(Long studentId, Long feeStructureId, Long currentPlanId) {
        boolean hasOtherActivePlan = installmentPlanRepository
                .findByStudent_IdAndFeeStructure_IdAndStatus(studentId, feeStructureId, InstallmentPlanStatus.ACTIVE)
                .stream()
                .anyMatch(plan -> currentPlanId == null || !plan.getId().equals(currentPlanId));

        if (hasOtherActivePlan) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An active installment plan already exists for this student and fee record");
        }
    }

    private double resolveOutstandingBalance(Long studentId, FeeStructure feeStructure) {
        double totalFee = resolveFeeStructureAmount(feeStructure);
        double totalPaid = coalesceAmount(feePaymentRepository.sumPaidAmount(studentId, feeStructure.getId()));
        return roundAmount(totalFee - totalPaid);
    }

    private double resolveFeeStructureAmount(FeeStructure feeStructure) {
        if (feeStructure.getAmount() != null && feeStructure.getAmount() > 0) {
            return roundAmount(feeStructure.getAmount());
        }

        return roundAmount(
                coalesceAmount(feeStructure.getRegistrationFee())
                        + coalesceAmount(feeStructure.getSchoolFee())
                        + coalesceAmount(feeStructure.getExamFee())
        );
    }

    private double sumScheduleAmounts(List<InstallmentSchedule> schedules) {
        return roundAmount(schedules.stream()
                .mapToDouble(schedule -> coalesceAmount(schedule.getAmount()))
                .sum());
    }

    private boolean hasRecordedPayments(InstallmentPlan plan) {
        return plan.getInstallments() != null
                && plan.getInstallments().stream().anyMatch(schedule -> coalesceAmount(schedule.getPaidAmount()) > 0.009);
    }

    private double normalizeAmount(Double amount, String message) {
        if (amount == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }

        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
        }

        return roundAmount(amount);
    }

    private double coalesceAmount(Double value) {
        return roundAmount(value != null ? value : 0.0);
    }

    private double roundAmount(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String buildInstallmentPaymentNotes(InstallmentSchedule schedule, String notes) {
        String installmentLabel = "Installment #" + schedule.getInstallmentNumber();
        String normalizedNotes = normalizeOptionalText(notes);
        if (normalizedNotes == null) {
            return installmentLabel;
        }
        return installmentLabel + " - " + normalizedNotes;
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
}
