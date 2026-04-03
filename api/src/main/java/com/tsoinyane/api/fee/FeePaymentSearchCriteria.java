package com.tsoinyane.api.fee;

import com.tsoinyane.api.school.Term;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Data
public class FeePaymentSearchCriteria {
    private Long schoolId;
    private String studentName;
    private String studentNumber;
    private Long gradeId;
    private Term term;
    private String academicYear;
    private PaymentMethod paymentMethod;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateTo;

    private Double amountFrom;
    private Double amountTo;
    private String referenceNumber;
    private Boolean includeReversed;
}
