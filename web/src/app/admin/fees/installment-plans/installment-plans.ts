import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../../grades/grade';
import { FeePayment } from '../fee-payment';
import { FeeStudent } from '../fee-student';
import { FeeStructure } from '../fee-structure';
import { InstallmentPlan } from '../installment-plan';
import { InstallmentSchedule } from '../installment-schedule';
import { HttpErrorResponse } from '@angular/common/http';
import { Term } from '../../settings/term';

@Component({
  selector: 'app-installment-plans',
  standalone: false,
  templateUrl: './installment-plans.html',
  styleUrl: './installment-plans.scss',
})
export class InstallmentPlans implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  selectedGradeFilter: number | null = null;
  selectedStatusFilter = 'ALL';
  
  installmentPlans: InstallmentPlan[] = [];
  payments: FeePayment[] = [];
  students: FeeStudent[] = [];
  feeStructures: FeeStructure[] = [];
  gradeOptions: Grade[] = [];
  
  showForm = false;
  editingPlan: InstallmentPlan | null = null;
  showPaymentForm = false;
  selectedPlanForPayment: InstallmentPlan | null = null;
  selectedInstallmentForPayment: InstallmentSchedule | null = null;
  selectedPlanForDetails: InstallmentPlan | null = null;
  actionMessage = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredPlans(): InstallmentPlan[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.installmentPlans
      .filter(plan => !this.selectedGradeFilter || plan.gradeId === this.selectedGradeFilter)
      .filter(plan => this.selectedStatusFilter === 'ALL' || plan.status === this.selectedStatusFilter)
      .filter(plan => {
        if (!query) return true;
        return plan.studentName.toLowerCase().includes(query)
          || plan.studentNumber.toLowerCase().includes(query)
          || plan.gradeName.toLowerCase().includes(query)
          || this.getTermLabel(plan.term).toLowerCase().includes(query);
      });
  }

  openForm(plan: InstallmentPlan | null = null): void {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing installment plans.';
      return;
    }
    this.errorMessage = '';
    this.editingPlan = plan ? { ...plan } : null;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingPlan = null;
  }

  openPaymentForm(plan: InstallmentPlan, installment: InstallmentSchedule): void {
    this.errorMessage = '';
    this.selectedPlanForPayment = plan;
    this.selectedInstallmentForPayment = installment;
    this.showPaymentForm = true;
  }

  closePaymentForm(): void {
    this.showPaymentForm = false;
    this.selectedPlanForPayment = null;
    this.selectedInstallmentForPayment = null;
  }

  openDetails(plan: InstallmentPlan): void {
    this.selectedPlanForDetails = plan;
  }

  closeDetails(): void {
    this.selectedPlanForDetails = null;
  }

  closeActionMessage(): void {
    this.actionMessage = '';
  }

  savePlan(plan: InstallmentPlan): void {
    this.isLoading = true;
    this.errorMessage = '';

    const request$ = plan.id
      ? this.backendService.put<InstallmentPlan, InstallmentPlan>(`installment-plan/${plan.id}`, plan)
      : this.backendService.post<InstallmentPlan, InstallmentPlan>('installment-plan', plan);

    request$.subscribe({
      next: savedPlan => {
        if (plan.id) {
          this.installmentPlans = this.installmentPlans.map(p => p.id === savedPlan.id ? this.normalizePlan(savedPlan) : p);
          this.actionMessage = 'Installment plan updated successfully.';
        } else {
          this.installmentPlans = [this.normalizePlan(savedPlan), ...this.installmentPlans];
          this.actionMessage = 'Installment plan created successfully.';
        }
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to save installment plan.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  saveInstallmentPayment(payment: FeePayment): void {
    if (!this.selectedPlanForPayment?.id) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const paymentData = {
      installmentId: this.selectedInstallmentForPayment?.id || 0,
      amount: payment.amount || 0,
      paymentDate: payment.paymentDate || '',
      paymentMethod: payment.paymentMethod || 'CASH',
      referenceNumber: payment.referenceNumber,
      notes: payment.notes
    };

    this.backendService.post<InstallmentPlan, typeof paymentData>(
      `installment-plan/${this.selectedPlanForPayment.id}/payment`,
      paymentData
    ).subscribe({
      next: updatedPlan => {
        const normalizedPlan = this.normalizePlan(updatedPlan);
        this.installmentPlans = this.installmentPlans.map(plan =>
          plan.id === normalizedPlan.id ? normalizedPlan : plan
        );
        this.actionMessage = 'Installment payment recorded successfully.';
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

  cancelPlan(plan: InstallmentPlan): void {
    if (confirm(`Are you sure you want to cancel the installment plan for ${plan.studentName}?`)) {
      this.isLoading = true;
      this.errorMessage = '';

      this.backendService.post<any, any>(`installment-plan/${plan.id}/cancel`, {}).subscribe({
        next: updatedPlan => {
          const updatedPlans = this.installmentPlans.map(p => 
            p.id === plan.id ? this.normalizePlan(updatedPlan) : p
          );
          this.installmentPlans = updatedPlans;
          this.actionMessage = 'Installment plan cancelled successfully.';
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to cancel installment plan.';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
    }
  }

  formatCurrency(value: number): string {
    return `M${value.toFixed(2)}`;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      case 'PAID': return 'status-paid';
      case 'OVERDUE': return 'status-overdue';
      default: return 'status-pending';
    }
  }

  getInstallmentProgress(plan: InstallmentPlan): { paid: number; total: number; percentage: number } {
    const paid = plan.installments.filter(i => i.status === 'PAID').length;
    const total = plan.installments.length;
    const percentage = total > 0 ? (paid / total) * 100 : 0;
    return { paid, total, percentage };
  }

  canEditPlan(plan: InstallmentPlan): boolean {
    return plan.status === 'ACTIVE' && !plan.installments.some(installment => Number(installment.paidAmount ?? 0) > 0);
  }

  getTermLabel(term: Term | string | null | undefined): string {
    if (!term) return '';
    
    switch (term) {
      case Term.TERM_1:
        return 'Term 1';
      case Term.TERM_2:
        return 'Term 2';
      case Term.TERM_3:
        return 'Term 3';
      case Term.TERM_4:
        return 'Term 4';
      default:
        return String(term);
    }
  }

  refreshFeeStructures(term?: Term, academicYear?: string): void {
    this.loadFeeStructures(term, academicYear);
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.resetData();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<Grade[]>('grade').subscribe({
      next: grades => {
        this.gradeOptions = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      },
      error: () => { this.gradeOptions = []; },
    });

    if (this.selectedSchoolId) {
      this.backendService.get<FeeStudent[]>('student', { schoolId: this.selectedSchoolId }).subscribe({
        next: students => { this.students = students ?? []; },
        error: () => { this.students = []; },
      });
    }

    // Load all fee structures initially - could be optimized to load on-demand
    this.loadFeeStructures();
    this.loadPayments();
    this.loadInstallmentPlans();
  }

  private loadFeeStructures(term?: Term, academicYear?: string): void {
    if (!this.selectedSchoolId) {
      this.feeStructures = [];
      return;
    }

    const params: any = { school_id: this.selectedSchoolId };
    if (term) params.term = term;
    if (academicYear) params.academic_year = academicYear;

    this.backendService.get<FeeStructure[]>('fee-structure', params).subscribe({
      next: structures => { 
        this.feeStructures = structures ?? [];
      },
      error: () => { 
        this.feeStructures = [];
      },
    });
  }

  private loadPayments(): void {
    if (!this.selectedSchoolId) {
      this.payments = [];
      return;
    }

    this.backendService.get<FeePayment[]>('fee-payment', { schoolId: this.selectedSchoolId }).subscribe({
      next: payments => {
        this.payments = (payments ?? []).map(payment => ({
          ...payment,
          amount: Number(payment.amount ?? 0),
          totalFee: Number(payment.totalFee ?? 0),
          totalPaid: Number(payment.totalPaid ?? 0),
          balance: Number(payment.balance ?? 0),
        }));
      },
      error: () => {
        this.payments = [];
      },
    });
  }

  private loadInstallmentPlans(): void {
    if (!this.selectedSchoolId) {
      this.installmentPlans = [];
      this.isLoading = false;
      return;
    }

    this.backendService.get<InstallmentPlan[]>('installment-plan', { schoolId: this.selectedSchoolId }).subscribe({
      next: plans => {
        this.installmentPlans = (plans ?? []).map(plan => this.normalizePlan(plan));
      },
      error: (error: HttpErrorResponse) => {
        this.installmentPlans = [];
        this.errorMessage = error.error?.message || 'Failed to load installment plans.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private resetData(): void {
    this.installmentPlans = [];
    this.payments = [];
    this.students = [];
    this.feeStructures = [];
    this.gradeOptions = [];
    this.isLoading = false;
  }

  private normalizePlan(plan: InstallmentPlan): InstallmentPlan {
    return {
      ...plan,
      totalAmount: Number(plan.totalAmount ?? 0),
      installments: (plan.installments ?? [])
        .map(installment => ({
          ...installment,
          amount: Number(installment.amount ?? 0),
          paidAmount: Number(installment.paidAmount ?? 0),
        }))
        .sort((left, right) => left.installmentNumber - right.installmentNumber),
    };
  }
}
