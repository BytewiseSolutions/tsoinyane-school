package com.tsoinyane.api.fee;

import com.tsoinyane.api.school.Term;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class FeeStructureDto {
    private Long id;
    private Instant createdAt;
    private Long schoolId;
    private String schoolName;
    private Long gradeId;
    private String gradeName;

    @NotNull(message = "Term is required")
    private Term term;

    @NotBlank(message = "Academic year is required")
    private String academicYear;

    private FeeType feeType;

    @DecimalMin(value = "0.00", message = "Registration fee cannot be negative")
    private Double registrationFee;

    @DecimalMin(value = "0.00", message = "School fee cannot be negative")
    private Double schoolFee;

    @DecimalMin(value = "0.00", message = "Exam fee cannot be negative")
    private Double examFee;

    @DecimalMin(value = "0.00", message = "Amount cannot be negative")
    private Double amount;

    private LocalDate termOpeningDate;
    private LocalDate termClosingDate;
    private Boolean updateTermDates;

    private Double totalAmount;
}
