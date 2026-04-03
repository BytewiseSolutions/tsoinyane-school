package com.tsoinyane.api.fee;

public class PaymentSummaryDto {
    private Double totalCollectedToday;
    private Double totalCollectedThisMonth;
    private Double totalOutstanding;
    private Integer paymentsToday;
    private Integer paymentsThisMonth;

    public PaymentSummaryDto() {}

    public PaymentSummaryDto(Double totalCollectedToday, Double totalCollectedThisMonth, 
                           Double totalOutstanding, Integer paymentsToday, Integer paymentsThisMonth) {
        this.totalCollectedToday = totalCollectedToday;
        this.totalCollectedThisMonth = totalCollectedThisMonth;
        this.totalOutstanding = totalOutstanding;
        this.paymentsToday = paymentsToday;
        this.paymentsThisMonth = paymentsThisMonth;
    }

    public Double getTotalCollectedToday() { return totalCollectedToday; }
    public void setTotalCollectedToday(Double totalCollectedToday) { this.totalCollectedToday = totalCollectedToday; }

    public Double getTotalCollectedThisMonth() { return totalCollectedThisMonth; }
    public void setTotalCollectedThisMonth(Double totalCollectedThisMonth) { this.totalCollectedThisMonth = totalCollectedThisMonth; }

    public Double getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(Double totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public Integer getPaymentsToday() { return paymentsToday; }
    public void setPaymentsToday(Integer paymentsToday) { this.paymentsToday = paymentsToday; }

    public Integer getPaymentsThisMonth() { return paymentsThisMonth; }
    public void setPaymentsThisMonth(Integer paymentsThisMonth) { this.paymentsThisMonth = paymentsThisMonth; }
}