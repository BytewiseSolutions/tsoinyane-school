package com.tsoinyane.api.fee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentPlanDto {
    private Long id;
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private Long gradeId;
    private String gradeName;
    private Long feeStructureId;
    private String term;
    private String academicYear;
    private Double totalAmount;
    private InstallmentPlanStatus status;
    private List<InstallmentScheduleDto> installments;
    private Instant createdAt;
    private Instant updatedAt;
}