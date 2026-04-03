package com.tsoinyane.api.fee;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "installment_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstallmentSchedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "installment_plan_id", nullable = false)
    private InstallmentPlan installmentPlan;
    
    @Column(name = "installment_number", nullable = false)
    private Integer installmentNumber;
    
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;
    
    @Column(name = "amount", nullable = false)
    private Double amount;
    
    @Column(name = "paid_amount", nullable = false)
    private Double paidAmount = 0.0;
    
    @Column(name = "paid_date")
    private LocalDate paidDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InstallmentScheduleStatus status;
}