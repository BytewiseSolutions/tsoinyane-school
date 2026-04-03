package com.tsoinyane.api.fee;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class StudentPaymentSummaryDto {
    Long studentId;
    String studentName;
    String studentNumber;
    Long gradeId;
    String gradeName;
    Double totalFeesAcrossAllTerms;
    Double totalPaidAcrossAllTerms;
    Double totalOutstandingAcrossAllTerms;
    List<TermSummaryDto> termSummaries;

    @Value
    @Builder
    public static class TermSummaryDto {
        String term;
        String academicYear;
        Double totalFee;
        Double totalPaid;
        Double balance;
        String status; 
        Integer paymentCount;
    }
}