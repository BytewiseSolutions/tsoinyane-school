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

    @NotNull(message = "Registration fee is required")
    @DecimalMin(value = "0.00", message = "Registration fee cannot be negative")
    private Double registrationFee;

    @NotNull(message = "School fee is required")
    @DecimalMin(value = "0.00", message = "School fee cannot be negative")
    private Double schoolFee;

    @NotNull(message = "Food fee is required")
    @DecimalMin(value = "0.00", message = "Food fee cannot be negative")
    private Double foodFee;

    @NotNull(message = "Books fee is required")
    @DecimalMin(value = "0.00", message = "Books fee cannot be negative")
    private Double booksFee;

    @NotNull(message = "General fee is required")
    @DecimalMin(value = "0.00", message = "General fee cannot be negative")
    private Double generalFee;

    @NotNull(message = "Exam fee is required")
    @DecimalMin(value = "0.00", message = "Exam fee cannot be negative")
    private Double examFee;

    private String description;
    private Double totalAmount;
}
