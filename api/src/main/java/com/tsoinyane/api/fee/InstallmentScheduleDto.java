package com.tsoinyane.api.fee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentScheduleDto {
    private Long id;
    private Integer installmentNumber;
    private LocalDate dueDate;
    private Double amount;
    private Double paidAmount;
    private LocalDate paidDate;
    private InstallmentScheduleStatus status;
}