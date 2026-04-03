package com.tsoinyane.api.fee;

import com.tsoinyane.api.grade.Grade;
import com.tsoinyane.api.school.School;
import com.tsoinyane.api.school.SchoolRepository;
import com.tsoinyane.api.school.Term;
import com.tsoinyane.api.security.CurrentUserService;
import com.tsoinyane.api.student.Student;
import com.tsoinyane.api.student.StudentRepository;
import com.tsoinyane.api.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeePaymentService {

    private final FeePaymentRepository feePaymentRepository;
    private final StudentRepository studentRepository;
    private final FeeStructureRepository feeStructureRepository;
    private final SchoolRepository schoolRepository;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public OutstandingSummaryDto getOutstandingSummary(Long schoolId) {
        if (schoolId == null) {
            return OutstandingSummaryDto.builder().learners(List.of()).gradeSummary(List.of()).build();
        }

        School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) {
            return OutstandingSummaryDto.builder().learners(List.of()).gradeSummary(List.of()).build();
        }

        Term currentTerm = school.getCurrentTerm();
        String academicYear = school.getAcademicYear();
        if (currentTerm == null || academicYear == null) {
            return OutstandingSummaryDto.builder().learners(List.of()).gradeSummary(List.of()).build();
        }

        List<Student> students = studentRepository.findAllBySchoolId(schoolId);
        List<FeeStructure> structures = feeStructureRepository.findAllWithAssociations(schoolId).stream()
                .filter(s -> academicYear.equals(s.getAcademicYear()))
                .filter(s -> s.getTerm() != null && termOrder(s.getTerm()) <= termOrder(currentTerm))
                .toList();
        List<FeePayment> payments = feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .filter(p -> !Boolean.TRUE.equals(p.getReversed()))
                .toList();

        Map<String, Double> paidByKey = new HashMap<>();
        Map<String, Integer> countByKey = new HashMap<>();
        payments.forEach(p -> {
            String key = p.getStudent().getId() + "-" + p.getFeeStructure().getId();
            paidByKey.merge(key, p.getAmount(), Double::sum);
            countByKey.merge(key, 1, Integer::sum);
        });

        Map<String, FeeStructure> structuresByGradeAndTerm = new LinkedHashMap<>();
        structures.forEach(s -> structuresByGradeAndTerm.put(s.getGrade().getId() + "-" + s.getTerm().name(), s));

        record OutstandingRecord(Long studentId, String studentName, String studentNumber,
                                 Long gradeId, String gradeName, String term,
                                 double totalFee, double totalPaid, double balance, int paymentCount) {}

        List<OutstandingRecord> records = new ArrayList<>();

        for (Student student : students) {
            if (student.getGrade() == null) continue;
            for (FeeStructure structure : structures) {
                if (!structure.getGrade().getId().equals(student.getGrade().getId())) continue;
                double totalFee = resolveTotalFee(structure);
                if (totalFee <= 0) continue;
                String key = student.getId() + "-" + structure.getId();
                double totalPaid = roundAmount(paidByKey.getOrDefault(key, 0.0));
                double balance = roundAmount(totalFee - totalPaid);
                if (balance <= 0.009) continue;
                int paymentCount = countByKey.getOrDefault(key, 0);
                records.add(new OutstandingRecord(
                        student.getId(), resolveStudentName(student), student.getStudentNumber(),
                        student.getGrade().getId(), student.getGrade().getName(),
                        structure.getTerm().name(), totalFee, totalPaid, balance, paymentCount
                ));
            }
        }

        Map<Long, OutstandingLearnerDto> learnerMap = new LinkedHashMap<>();
        Map<Long, Set<String>> termsByStudent = new HashMap<>();

        records.forEach(r -> {
            OutstandingLearnerDto dto = learnerMap.computeIfAbsent(r.studentId(), id ->
                    OutstandingLearnerDto.builder()
                            .studentId(r.studentId()).studentName(r.studentName())
                            .studentNumber(r.studentNumber()).gradeId(r.gradeId())
                            .gradeName(r.gradeName()).totalFee(0.0).totalPaid(0.0)
                            .balance(0.0).paymentCount(0).build());
            dto.setTotalFee(roundAmount(dto.getTotalFee() + r.totalFee()));
            dto.setTotalPaid(roundAmount(dto.getTotalPaid() + r.totalPaid()));
            dto.setBalance(roundAmount(dto.getBalance() + r.balance()));
            dto.setPaymentCount(dto.getPaymentCount() + r.paymentCount());
            termsByStudent.computeIfAbsent(r.studentId(), id -> new HashSet<>()).add(r.term());
        });

        learnerMap.values().forEach(dto ->
                dto.setTerms(termsByStudent.getOrDefault(dto.getStudentId(), Set.of())
                        .stream().sorted().collect(Collectors.joining(", "))));

        List<OutstandingLearnerDto> learners = learnerMap.values().stream()
                .sorted(Comparator.comparingDouble(OutstandingLearnerDto::getBalance).reversed())
                .toList();

        Map<String, GradeOutstandingSummaryDto> gradeMap = new LinkedHashMap<>();
        Map<String, Set<Long>> learnersByGrade = new HashMap<>();

        records.forEach(r -> {
            GradeOutstandingSummaryDto dto = gradeMap.computeIfAbsent(r.gradeName(), name ->
                    GradeOutstandingSummaryDto.builder()
                            .gradeName(name).learnerCount(0)
                            .totalFee(0.0).totalPaid(0.0).balance(0.0).build());
            dto.setTotalFee(roundAmount(dto.getTotalFee() + r.totalFee()));
            dto.setTotalPaid(roundAmount(dto.getTotalPaid() + r.totalPaid()));
            dto.setBalance(roundAmount(dto.getBalance() + r.balance()));
            learnersByGrade.computeIfAbsent(r.gradeName(), name -> new HashSet<>()).add(r.studentId());
        });

        gradeMap.values().forEach(dto ->
                dto.setLearnerCount(learnersByGrade.getOrDefault(dto.getGradeName(), Set.of()).size()));

        List<GradeOutstandingSummaryDto> gradeSummary = gradeMap.values().stream()
                .sorted(Comparator.comparing(GradeOutstandingSummaryDto::getGradeName,
                        Comparator.comparingInt(this::gradeOrder)))
                .toList();

        return OutstandingSummaryDto.builder().learners(learners).gradeSummary(gradeSummary).build();
    }

    @Transactional(readOnly = true)
    public PaymentSummaryDto getPaymentSummary(Long schoolId) {
        if (schoolId == null) {
            return new PaymentSummaryDto(0.0, 0.0, 0.0, 0, 0);
        }

        LocalDate today = LocalDate.now();
        LocalDate firstDayOfMonth = today.withDayOfMonth(1);

        // Today's collections
        Double todayCollected = feePaymentRepository.sumCollectedBySchoolAndDateRange(schoolId, today, today);
        Integer todayCount = feePaymentRepository.countPaymentsBySchoolAndDateRange(schoolId, today, today);

        // This month's collections
        Double monthCollected = feePaymentRepository.sumCollectedBySchoolAndDateRange(schoolId, firstDayOfMonth, today);
        Integer monthCount = feePaymentRepository.countPaymentsBySchoolAndDateRange(schoolId, firstDayOfMonth, today);

        // Total outstanding
        OutstandingSummaryDto outstanding = getOutstandingSummary(schoolId);
        Double totalOutstanding = outstanding.getLearners().stream()
                .mapToDouble(OutstandingLearnerDto::getBalance)
                .sum();

        return new PaymentSummaryDto(
                coalesceAmount(todayCollected),
                coalesceAmount(monthCollected),
                roundAmount(totalOutstanding),
                todayCount != null ? todayCount : 0,
                monthCount != null ? monthCount : 0
        );
    }

    @Transactional(readOnly = true)
    public List<CollectionReportDto> getCollectionReports(Long schoolId, LocalDate fromDate, LocalDate toDate, Long gradeId) {
        if (schoolId == null || fromDate == null || toDate == null) {
            return List.of();
        }

        List<FeePayment> payments = feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .filter(p -> !Boolean.TRUE.equals(p.getReversed()))
                .filter(p -> p.getPaymentDate() != null)
                .filter(p -> !p.getPaymentDate().isBefore(fromDate) && !p.getPaymentDate().isAfter(toDate))
                .filter(p -> gradeId == null || (p.getStudent().getGrade() != null && gradeId.equals(p.getStudent().getGrade().getId())))
                .toList();

        Map<LocalDate, List<FeePayment>> paymentsByDate = payments.stream()
                .collect(Collectors.groupingBy(FeePayment::getPaymentDate));

        return paymentsByDate.entrySet().stream()
                .map(entry -> {
                    LocalDate date = entry.getKey();
                    List<FeePayment> dayPayments = entry.getValue();

                    double totalCollected = dayPayments.stream().mapToDouble(p -> coalesceAmount(p.getAmount())).sum();
                    int paymentCount = dayPayments.size();

                    double cashAmount = dayPayments.stream()
                            .filter(p -> PaymentMethod.CASH.equals(p.getPaymentMethod()))
                            .mapToDouble(p -> coalesceAmount(p.getAmount()))
                            .sum();

                    double bankAmount = dayPayments.stream()
                            .filter(p -> PaymentMethod.BANK.equals(p.getPaymentMethod()))
                            .mapToDouble(p -> coalesceAmount(p.getAmount()))
                            .sum();

                    double mobileAmount = dayPayments.stream()
                            .filter(p -> PaymentMethod.MPESA.equals(p.getPaymentMethod()) || PaymentMethod.ECO_CASH.equals(p.getPaymentMethod()))
                            .mapToDouble(p -> coalesceAmount(p.getAmount()))
                            .sum();

                    return new CollectionReportDto(
                            date,
                            roundAmount(totalCollected),
                            paymentCount,
                            roundAmount(cashAmount),
                            roundAmount(bankAmount),
                            roundAmount(mobileAmount)
                    );
                })
                .sorted(Comparator.comparing(CollectionReportDto::getDate).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OutstandingReportDto> getOutstandingReports(Long schoolId, Long gradeId) {
        if (schoolId == null) {
            return List.of();
        }

        OutstandingSummaryDto outstanding = getOutstandingSummary(schoolId);
        List<OutstandingLearnerDto> learners = outstanding.getLearners().stream()
                .filter(l -> gradeId == null || gradeId.equals(l.getGradeId()))
                .toList();

        Map<String, List<OutstandingLearnerDto>> learnersByGrade = learners.stream()
                .collect(Collectors.groupingBy(OutstandingLearnerDto::getGradeName));

        // Get total students per grade
        List<Student> allStudents = studentRepository.findAllBySchoolId(schoolId).stream()
                .filter(s -> gradeId == null || (s.getGrade() != null && gradeId.equals(s.getGrade().getId())))
                .toList();

        Map<String, Long> totalStudentsByGrade = allStudents.stream()
                .filter(s -> s.getGrade() != null)
                .collect(Collectors.groupingBy(s -> s.getGrade().getName(), Collectors.counting()));

        return learnersByGrade.entrySet().stream()
                .map(entry -> {
                    String gradeName = entry.getKey();
                    List<OutstandingLearnerDto> gradeLearners = entry.getValue();

                    Long gradeIdForReport = gradeLearners.isEmpty() ? null : gradeLearners.get(0).getGradeId();
                    int totalStudents = totalStudentsByGrade.getOrDefault(gradeName, 0L).intValue();
                    int studentsWithOutstanding = gradeLearners.size();
                    double totalOutstanding = gradeLearners.stream().mapToDouble(OutstandingLearnerDto::getBalance).sum();
                    double averageOutstanding = studentsWithOutstanding > 0 ? totalOutstanding / studentsWithOutstanding : 0.0;

                    return new OutstandingReportDto(
                            gradeIdForReport,
                            gradeName,
                            totalStudents,
                            studentsWithOutstanding,
                            roundAmount(totalOutstanding),
                            roundAmount(averageOutstanding)
                    );
                })
                .sorted(Comparator.comparing(OutstandingReportDto::getGradeName, Comparator.comparingInt(this::gradeOrder)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodBreakdownDto> getPaymentMethodBreakdown(Long schoolId, LocalDate fromDate, LocalDate toDate, Long gradeId) {
        if (schoolId == null || fromDate == null || toDate == null) {
            return List.of();
        }

        List<FeePayment> payments = feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .filter(payment -> !Boolean.TRUE.equals(payment.getReversed()))
                .filter(payment -> payment.getPaymentDate() != null)
                .filter(payment -> !payment.getPaymentDate().isBefore(fromDate) && !payment.getPaymentDate().isAfter(toDate))
                .filter(payment -> gradeId == null || (payment.getStudent().getGrade() != null && gradeId.equals(payment.getStudent().getGrade().getId())))
                .toList();

        double grandTotal = payments.stream()
                .mapToDouble(payment -> coalesceAmount(payment.getAmount()))
                .sum();

        Map<PaymentMethod, List<FeePayment>> paymentsByMethod = payments.stream()
                .filter(payment -> payment.getPaymentMethod() != null)
                .collect(Collectors.groupingBy(FeePayment::getPaymentMethod, () -> new EnumMap<>(PaymentMethod.class), Collectors.toList()));

        return paymentsByMethod.entrySet().stream()
                .map(entry -> {
                    double totalAmount = entry.getValue().stream()
                            .mapToDouble(payment -> coalesceAmount(payment.getAmount()))
                            .sum();
                    int paymentCount = entry.getValue().size();
                    double averageAmount = paymentCount > 0 ? totalAmount / paymentCount : 0.0;
                    double percentageOfTotal = grandTotal > 0 ? (totalAmount / grandTotal) * 100.0 : 0.0;

                    return new PaymentMethodBreakdownDto(
                            entry.getKey(),
                            roundAmount(totalAmount),
                            paymentCount,
                            roundAmount(averageAmount),
                            roundAmount(percentageOfTotal)
                    );
                })
                .sorted(Comparator.comparing(PaymentMethodBreakdownDto::getTotalAmount).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReversedPaymentReportDto> getReversedPaymentReports(Long schoolId, LocalDate fromDate, LocalDate toDate, Long gradeId) {
        if (schoolId == null || fromDate == null || toDate == null) {
            return List.of();
        }

        return feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .filter(payment -> Boolean.TRUE.equals(payment.getReversed()))
                .filter(payment -> payment.getPaymentDate() != null)
                .filter(payment -> !payment.getPaymentDate().isBefore(fromDate) && !payment.getPaymentDate().isAfter(toDate))
                .filter(payment -> gradeId == null || (payment.getStudent().getGrade() != null && gradeId.equals(payment.getStudent().getGrade().getId())))
                .map(payment -> new ReversedPaymentReportDto(
                        payment.getId(),
                        payment.getStudent().getId(),
                        resolveStudentName(payment.getStudent()),
                        payment.getStudent().getStudentNumber(),
                        payment.getStudent().getGrade() != null ? payment.getStudent().getGrade().getId() : null,
                        payment.getStudent().getGrade() != null ? payment.getStudent().getGrade().getName() : null,
                        payment.getFeeStructure().getTerm() != null ? payment.getFeeStructure().getTerm().name() : null,
                        payment.getFeeStructure().getAcademicYear(),
                        payment.getPaymentDate(),
                        payment.getPaymentMethod(),
                        coalesceAmount(payment.getAmount()),
                        payment.getReferenceNumber(),
                        payment.getReversedAt(),
                        payment.getReversalReason()
                ))
                .sorted(Comparator.comparing(ReversedPaymentReportDto::getReversedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeePaymentDto> getFeePayments(Long schoolId) {
        return feePaymentRepository.findAllWithAssociations(schoolId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FeePaymentDto> searchFeePayments(FeePaymentSearchCriteria criteria) {
        if (criteria == null) {
            return List.of();
        }

        LocalDate dateFrom = criteria.getDateFrom();
        LocalDate dateTo = criteria.getDateTo();
        Double amountFrom = normalizeSearchAmount(criteria.getAmountFrom());
        Double amountTo = normalizeSearchAmount(criteria.getAmountTo());

        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From date cannot be after to date");
        }

        if (amountFrom != null && amountTo != null && amountFrom > amountTo) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Minimum amount cannot be greater than maximum amount");
        }

        return feePaymentRepository.searchWithAssociations(
                        criteria.getSchoolId(),
                        normalizeOptionalText(criteria.getStudentName()),
                        normalizeOptionalText(criteria.getStudentNumber()),
                        criteria.getGradeId(),
                        criteria.getTerm(),
                        normalizeOptionalText(criteria.getAcademicYear()),
                        criteria.getPaymentMethod(),
                        dateFrom,
                        dateTo,
                        amountFrom,
                        amountTo,
                        normalizeOptionalText(criteria.getReferenceNumber()),
                        Boolean.TRUE.equals(criteria.getIncludeReversed())
                ).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeePaymentDto getFeePayment(Long id) {
        return feePaymentRepository.findWithAssociationsById(id)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));
    }

    @Transactional(readOnly = true)
    public List<FeePaymentDto> getStudentPaymentHistory(Long schoolId, Long studentId, boolean includeReversed) {
        if (studentId == null || studentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student is required");
        }

        return feePaymentRepository.findStudentHistoryWithAssociations(schoolId, studentId, includeReversed).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentPaymentSummaryDto getStudentPaymentSummary(Long paymentId) {
        FeePayment payment = feePaymentRepository.findWithAssociationsById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));

        return buildStudentPaymentSummary(payment.getStudent());
    }

    @Transactional(readOnly = true)
    public StudentPaymentSummaryDto getStudentPaymentStatement(Long schoolId, Long studentId) {
        if (studentId == null || studentId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student is required");
        }

        Student student = studentRepository.findWithAssociationsById(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found"));

        if (schoolId != null && (student.getSchool() == null || !schoolId.equals(student.getSchool().getId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student does not belong to the selected school");
        }

        return buildStudentPaymentSummary(student);
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
                .reversed(false)
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
    public FeePaymentDto reversePayment(Long id, String reason) {
        FeePayment existing = feePaymentRepository.findWithAssociationsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Fee payment not found"));

        if (Boolean.TRUE.equals(existing.getReversed())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This payment has already been reversed");
        }

        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reversal reason is required");
        }

        User actor = currentUserService.getCurrentUser();
        existing.setReversed(true);
        existing.setReversedAt(Instant.now());
        existing.setReversalReason(reason.trim());
        existing.setReversedBy(actor);
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

    private StudentPaymentSummaryDto buildStudentPaymentSummary(Student student) {
        if (student.getSchool() == null) {
            return StudentPaymentSummaryDto.builder()
                    .studentId(student.getId())
                    .studentName(resolveStudentName(student))
                    .studentNumber(student.getStudentNumber())
                    .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                    .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                    .totalFeesAcrossAllTerms(0.0)
                    .totalPaidAcrossAllTerms(0.0)
                    .totalOutstandingAcrossAllTerms(0.0)
                    .termSummaries(List.of())
                    .build();
        }

        Long schoolId = student.getSchool().getId();
        School school = student.getSchool();
        Term currentTerm = school.getCurrentTerm();
        String academicYear = school.getAcademicYear();

        List<FeePayment> allStudentPayments = feePaymentRepository.findStudentHistoryWithAssociations(schoolId, student.getId(), false);

        List<FeeStructure> allStructures = feeStructureRepository.findAllWithAssociations(schoolId).stream()
                .filter(structure -> student.getGrade() != null && structure.getGrade().getId().equals(student.getGrade().getId()))
                .filter(structure -> academicYear != null && academicYear.equals(structure.getAcademicYear()))
                .filter(structure -> currentTerm == null || structure.getTerm() == null || termOrder(structure.getTerm()) <= termOrder(currentTerm))
                .toList();

        double totalFeesAcrossAllTerms = allStructures.stream()
                .mapToDouble(this::resolveTotalFee)
                .sum();

        double totalPaidAcrossAllTerms = allStudentPayments.stream()
                .mapToDouble(payment -> payment.getAmount() != null ? payment.getAmount() : 0.0)
                .sum();

        double totalOutstandingAcrossAllTerms = Math.max(0, totalFeesAcrossAllTerms - totalPaidAcrossAllTerms);

        Map<String, List<FeeStructure>> structuresByTerm = allStructures.stream()
                .collect(Collectors.groupingBy(structure -> structure.getTerm() + "-" + structure.getAcademicYear()));

        List<StudentPaymentSummaryDto.TermSummaryDto> termSummaries = structuresByTerm.entrySet().stream()
                .map(entry -> {
                    String[] parts = entry.getKey().split("-", 2);
                    String term = parts[0];
                    String academicYearForTerm = parts.length > 1 ? parts[1] : "";

                    List<FeeStructure> termStructures = entry.getValue();
                    double termTotalFee = termStructures.stream().mapToDouble(this::resolveTotalFee).sum();

                    double termTotalPaid = allStudentPayments.stream()
                            .filter(payment -> termStructures.stream().anyMatch(structure -> structure.getId().equals(payment.getFeeStructure().getId())))
                            .mapToDouble(payment -> payment.getAmount() != null ? payment.getAmount() : 0.0)
                            .sum();

                    double termBalance = Math.max(0, termTotalFee - termTotalPaid);

                    int paymentCount = (int) allStudentPayments.stream()
                            .filter(payment -> termStructures.stream().anyMatch(structure -> structure.getId().equals(payment.getFeeStructure().getId())))
                            .count();

                    return StudentPaymentSummaryDto.TermSummaryDto.builder()
                            .term(term)
                            .academicYear(academicYearForTerm)
                            .totalFee(roundAmount(termTotalFee))
                            .totalPaid(roundAmount(termTotalPaid))
                            .balance(roundAmount(termBalance))
                            .status(termBalance <= 0.009 ? "PAID" : "OUTSTANDING")
                            .paymentCount(paymentCount)
                            .build();
                })
                .sorted(Comparator.comparing(StudentPaymentSummaryDto.TermSummaryDto::getAcademicYear)
                        .thenComparing(summary -> termOrder(Term.valueOf(summary.getTerm()))))
                .toList();

        return StudentPaymentSummaryDto.builder()
                .studentId(student.getId())
                .studentName(resolveStudentName(student))
                .studentNumber(student.getStudentNumber())
                .gradeId(student.getGrade() != null ? student.getGrade().getId() : null)
                .gradeName(student.getGrade() != null ? student.getGrade().getName() : null)
                .totalFeesAcrossAllTerms(roundAmount(totalFeesAcrossAllTerms))
                .totalPaidAcrossAllTerms(roundAmount(totalPaidAcrossAllTerms))
                .totalOutstandingAcrossAllTerms(roundAmount(totalOutstandingAcrossAllTerms))
                .termSummaries(termSummaries)
                .build();
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
                .reversed(Boolean.TRUE.equals(feePayment.getReversed()))
                .reversedAt(feePayment.getReversedAt())
                .reversalReason(feePayment.getReversalReason())
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

    private Double normalizeSearchAmount(Double value) {
        if (value == null) {
            return null;
        }

        if (value < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search amounts cannot be negative");
        }

        return roundAmount(value);
    }

    private double coalesceAmount(Double value) {
        return roundAmount(value != null ? value : 0.0);
    }

    private double roundAmount(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private int termOrder(Term term) {
        return switch (term) {
            case TERM_1 -> 1;
            case TERM_2 -> 2;
            case TERM_3 -> 3;
            case TERM_4 -> 4;
        };
    }

    private int gradeOrder(String gradeName) {
        if (gradeName == null) return Integer.MAX_VALUE;
        String digits = gradeName.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? Integer.MAX_VALUE : Integer.parseInt(digits);
    }
}
