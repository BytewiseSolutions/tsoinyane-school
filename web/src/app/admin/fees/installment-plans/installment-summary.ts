import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { InstallmentPlan } from '../installment-plan';

@Component({
  selector: 'app-installment-summary',
  standalone: false,
  templateUrl: './installment-summary.html',
  styleUrl: './installment-summary.scss',
})
export class InstallmentSummary {
  @Input() plan!: InstallmentPlan;
  @Output() recordPayment = new EventEmitter<{ plan: InstallmentPlan; installment: any }>();
  @Output() editPlan = new EventEmitter<InstallmentPlan>();
  @Output() cancelPlan = new EventEmitter<InstallmentPlan>();

  constructor(private router: Router) {}

  get nextDueInstallment() {
    return this.plan.installments
      .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  }

  get progressPercentage(): number {
    const paid = this.plan.installments.filter(i => i.status === 'PAID').length;
    const total = this.plan.installments.length;
    return total > 0 ? (paid / total) * 100 : 0;
  }

  get paidInstallmentsCount(): number {
    return this.plan.installments.filter(i => i.status === 'PAID').length;
  }

  get totalInstallmentsCount(): number {
    return this.plan.installments.length;
  }

  get statusClass(): string {
    if (this.plan.status === 'COMPLETED') return 'completed';
    if (this.plan.status === 'CANCELLED') return 'cancelled';
    if (this.plan.installments.some(i => i.status === 'OVERDUE')) return 'overdue';
    return 'active';
  }

  onViewDetails(): void {
    this.router.navigate(['/admin/fees/installments', this.plan.id]);
  }

  onQuickPay(): void {
    if (this.nextDueInstallment) {
      this.recordPayment.emit({ plan: this.plan, installment: this.nextDueInstallment });
    }
  }

  formatCurrency(amount: number): string {
    return `M${amount.toFixed(2)}`;
  }
}