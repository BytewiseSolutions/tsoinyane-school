package com.tsoinyane.api.fee;

public class PaymentMethodBreakdownDto {
    private PaymentMethod paymentMethod;
    private Double totalAmount;
    private Integer paymentCount;
    private Double averageAmount;
    private Double percentageOfTotal;

    public PaymentMethodBreakdownDto() {}

    public PaymentMethodBreakdownDto(
            PaymentMethod paymentMethod,
            Double totalAmount,
            Integer paymentCount,
            Double averageAmount,
            Double percentageOfTotal
    ) {
        this.paymentMethod = paymentMethod;
        this.totalAmount = totalAmount;
        this.paymentCount = paymentCount;
        this.averageAmount = averageAmount;
        this.percentageOfTotal = percentageOfTotal;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Integer getPaymentCount() {
        return paymentCount;
    }

    public void setPaymentCount(Integer paymentCount) {
        this.paymentCount = paymentCount;
    }

    public Double getAverageAmount() {
        return averageAmount;
    }

    public void setAverageAmount(Double averageAmount) {
        this.averageAmount = averageAmount;
    }

    public Double getPercentageOfTotal() {
        return percentageOfTotal;
    }

    public void setPercentageOfTotal(Double percentageOfTotal) {
        this.percentageOfTotal = percentageOfTotal;
    }
}
