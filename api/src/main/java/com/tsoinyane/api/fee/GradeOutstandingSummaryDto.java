package com.tsoinyane.api.fee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeOutstandingSummaryDto {
    private String gradeName;
    private Integer learnerCount;
    private Double totalFee;
    private Double totalPaid;
    private Double balance;
}
