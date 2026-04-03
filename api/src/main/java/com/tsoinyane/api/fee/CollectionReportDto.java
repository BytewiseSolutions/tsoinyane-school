package com.tsoinyane.api.fee;

import java.time.LocalDate;

public class CollectionReportDto {
    private LocalDate date;
    private Double totalCollected;
    private Integer paymentCount;
    private Double cashAmount;
    private Double bankAmount;
    private Double mobileAmount;

    public CollectionReportDto() {}

    public CollectionReportDto(LocalDate date, Double totalCollected, Integer paymentCount,
                              Double cashAmount, Double bankAmount, Double mobileAmount) {
        this.date = date;
        this.totalCollected = totalCollected;
        this.paymentCount = paymentCount;
        this.cashAmount = cashAmount;
        this.bankAmount = bankAmount;
        this.mobileAmount = mobileAmount;
    }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Double getTotalCollected() { return totalCollected; }
    public void setTotalCollected(Double totalCollected) { this.totalCollected = totalCollected; }

    public Integer getPaymentCount() { return paymentCount; }
    public void setPaymentCount(Integer paymentCount) { this.paymentCount = paymentCount; }

    public Double getCashAmount() { return cashAmount; }
    public void setCashAmount(Double cashAmount) { this.cashAmount = cashAmount; }

    public Double getBankAmount() { return bankAmount; }
    public void setBankAmount(Double bankAmount) { this.bankAmount = bankAmount; }

    public Double getMobileAmount() { return mobileAmount; }
    public void setMobileAmount(Double mobileAmount) { this.mobileAmount = mobileAmount; }
}