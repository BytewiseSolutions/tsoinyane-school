package com.tsoinyane.api.fee;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeePaymentDto {
    private Long id;
    private Instant createdAt;
    private Long schoolId;
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private Long feeStructureId;
    private Long gradeId;
    private String gradeName;
    private String term;
    private String academicYear;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private Double amount;

    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    private String referenceNumber;
    private String notes;
    private Double totalFee;
    private Double totalPaid;
    private Double balance;
}
