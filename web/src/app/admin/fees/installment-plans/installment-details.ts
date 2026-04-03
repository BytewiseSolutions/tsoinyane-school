import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { InstallmentPlan } from '../installment-plan';
import { InstallmentSchedule } from '../installment-schedule';
import { FeeStudent } from '../fee-student';
import { FeeStructure } from '../fee-structure';
import { FeePayment } from '../fee-payment';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-installment-details',
  standalone: false,
  templateUrl: './installment-details.html',
  styleUrl: './installment-details.scss',
})
export class InstallmentDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  plan: InstallmentPlan | null = null;
  students: FeeStudent[] = [];
  feeStructures: FeeStructure[] = [];
  payments: FeePayment[] = [];
  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  isLoading = false;
  errorMessage = '';
  actionMessage = '';
  showPaymentForm = false;
  selectedInstallment: InstallmentSchedule | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$.pipe(takeUntil(this.destroy$)).subscribe(school => {
      this.selectedSchoolId = school?.id ?? null;
      this.selectedSchoolName = school?.name ?? '';
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) this.loadPlan(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPaid(): number {
    return (this.plan?.installments ?? [])
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + i.amount, 0);
  }

  get remainingBalance(): number {
    return (this.plan?.totalAmount ?? 0) - this.totalPaid;
  }

  get progressPercentage(): number {
    const total = this.plan?.totalAmount ?? 0;
    return total > 0 ? (this.totalPaid / total) * 100 : 0;
  }

  get paidInstallmentsCount(): number {
    return (this.plan?.installments ?? []).filter(i => i.status === 'PAID').length;
  }

  get totalInstallmentsCount(): number {
    return this.plan?.installments?.length ?? 0;
  }

  get overDueCount(): number {
    return (this.plan?.installments ?? []).filter(i => i.status === 'OVERDUE').length;
  }

  get nextDueDate(): string | null {
    const next = (this.plan?.installments ?? [])
      .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    return next?.dueDate ?? null;
  }

  goBack(): void {
    this.router.navigate(['/admin/fees/installments']);
  }

  openPaymentForm(installment: InstallmentSchedule): void {
    this.selectedInstallment = installment;
    this.showPaymentForm = true;
  }

  closePaymentForm(): void {
    this.showPaymentForm = false;
    this.selectedInstallment = null;
  }

  savePayment(payment: FeePayment): void {
    if (!this.plan?.id || !this.selectedInstallment?.id) return;

    this.isLoading = true;
    this.errorMessage = '';

    const paymentData = {
      installmentId: this.selectedInstallment.id,
      amount: Number(payment.amount ?? 0),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber ?? null,
      notes: payment.notes ?? null,
    };

    this.backendService.post<InstallmentPlan, typeof paymentData>(
      `installment-plan/${this.plan.id}/payment`,
      paymentData
    ).subscribe({
      next: updatedPlan => {
        this.plan = {
          ...updatedPlan,
          totalAmount: Number(updatedPlan.totalAmount ?? 0),
          installments: (updatedPlan.installments ?? [])
            .map(i => ({ ...i, amount: Number(i.amount ?? 0), paidAmount: Number(i.paidAmount ?? 0) }))
            .sort((a, b) => a.installmentNumber - b.installmentNumber),
        };
        this.actionMessage = 'Payment recorded successfully.';
        this.closePaymentForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to record payment.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'status-paid';
      case 'OVERDUE': return 'status-overdue';
      default: return 'status-pending';
    }
  }

  getInstallmentStatusIcon(status: string): string {
    switch (status) {
      case 'PAID': return 'fa-check-circle';
      case 'OVERDUE': return 'fa-exclamation-triangle';
      default: return 'fa-clock';
    }
  }

  isOverdue(installment: InstallmentSchedule): boolean {
    return installment.status === 'OVERDUE' ||
      (installment.status === 'PENDING' && new Date(installment.dueDate) < new Date());
  }

  formatCurrency(amount: number): string {
    return `M${amount.toFixed(2)}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  private loadPlan(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<InstallmentPlan>(`installment-plan/${id}`).subscribe({
      next: plan => {
        this.plan = {
          ...plan,
          totalAmount: Number(plan.totalAmount ?? 0),
          installments: (plan.installments ?? [])
            .map(i => ({ ...i, amount: Number(i.amount ?? 0), paidAmount: Number(i.paidAmount ?? 0) }))
            .sort((a, b) => a.installmentNumber - b.installmentNumber),
        };
        this.loadSupportingData(plan.studentId, plan.feeStructureId, plan.schoolId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load installment plan.';
        this.isLoading = false;
      }
    });
  }

  private loadSupportingData(studentId: number, feeStructureId: number, planSchoolId?: number): void {
    const schoolId = this.selectedSchoolId ?? planSchoolId ?? null;
    if (!schoolId) {
      this.isLoading = false;
      return;
    }

    this.backendService.get<FeeStudent[]>('student', { schoolId }).subscribe({
      next: students => { this.students = students ?? []; },
      error: () => { this.students = []; },
    });

    this.backendService.get<FeeStructure[]>('fee-structure', { schoolId }).subscribe({
      next: structures => { this.feeStructures = structures ?? []; },
      error: () => { this.feeStructures = []; },
    });

    this.backendService.get<FeePayment[]>('fee-payment', { schoolId }).subscribe({
      next: payments => {
        this.payments = (payments ?? []).map(p => ({
          ...p,
          amount: Number(p.amount ?? 0),
          totalFee: Number(p.totalFee ?? 0),
          totalPaid: Number(p.totalPaid ?? 0),
          balance: Number(p.balance ?? 0),
        }));
      },
      error: () => { this.payments = []; },
      complete: () => { this.isLoading = false; }
    });
  }
}
