package com.tsoinyane.api.fee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutstandingLearnerDto {
    private Long studentId;
    private String studentName;
    private String studentNumber;
    private Long gradeId;
    private String gradeName;
    private String terms;
    private Double totalFee;
    private Double totalPaid;
    private Double balance;
    private Integer paymentCount;
}
