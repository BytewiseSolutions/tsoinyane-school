package com.tsoinyane.api.fee;

import com.tsoinyane.api.school.Term;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;

@Value
@Builder
public class FeeStructureDto {
    Long id;
    Instant createdAt;
    Long schoolId;
    String schoolName;
    Long gradeId;
    String gradeName;

    @NotNull(message = "Term is required")
    Term term;

    @NotBlank(message = "Academic year is required")
    String academicYear;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal amount;

    String description;
}
