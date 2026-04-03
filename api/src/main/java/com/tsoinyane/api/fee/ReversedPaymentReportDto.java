package com.tsoinyane.api.fee;

import java.time.Instant;
import java.time.LocalDate;

public class ReversedPaymentReportDto {
    private Long paymentId;
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private Long gradeId;
    private String gradeName;
    private String term;
    private String academicYear;
    private LocalDate paymentDate;
    private PaymentMethod paymentMethod;
    private Double amount;
    private String referenceNumber;
    private Instant reversedAt;
    private String reversalReason;

    public ReversedPaymentReportDto() {}

    public ReversedPaymentReportDto(
            Long paymentId,
            Long studentId,
            String studentName,
            String studentNumber,
            Long gradeId,
            String gradeName,
            String term,
            String academicYear,
            LocalDate paymentDate,
            PaymentMethod paymentMethod,
            Double amount,
            String referenceNumber,
            Instant reversedAt,
            String reversalReason
    ) {
        this.paymentId = paymentId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentNumber = studentNumber;
        this.gradeId = gradeId;
        this.gradeName = gradeName;
        this.term = term;
        this.academicYear = academicYear;
        this.paymentDate = paymentDate;
        this.paymentMethod = paymentMethod;
        this.amount = amount;
        this.referenceNumber = referenceNumber;
        this.reversedAt = reversedAt;
        this.reversalReason = reversalReason;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getStudentNumber() {
        return studentNumber;
    }

    public void setStudentNumber(String studentNumber) {
        this.studentNumber = studentNumber;
    }

    public Long getGradeId() {
        return gradeId;
    }

    public void setGradeId(Long gradeId) {
        this.gradeId = gradeId;
    }

    public String getGradeName() {
        return gradeName;
    }

    public void setGradeName(String gradeName) {
        this.gradeName = gradeName;
    }

    public String getTerm() {
        return term;
    }

    public void setTerm(String term) {
        this.term = term;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(String academicYear) {
        this.academicYear = academicYear;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public Instant getReversedAt() {
        return reversedAt;
    }

    public void setReversedAt(Instant reversedAt) {
        this.reversedAt = reversedAt;
    }

    public String getReversalReason() {
        return reversalReason;
    }

    public void setReversalReason(String reversalReason) {
        this.reversalReason = reversalReason;
    }
}
