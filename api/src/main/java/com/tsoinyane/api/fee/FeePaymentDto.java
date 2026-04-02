package com.tsoinyane.api.fee;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Value
@Builder
public class FeePaymentDto {
    Long id;
    Instant createdAt;
    Long studentId;
    String studentName;
    String studentNumber;
    Long feeStructureId;
    String gradeName;
    String term;
    String academicYear;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal amount;

    @NotNull(message = "Payment date is required")
    LocalDate paymentDate;

    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod;

    String referenceNumber;
    String notes;
    BigDecimal totalFee;
    BigDecimal totalPaid;
    BigDecimal balance;
}
