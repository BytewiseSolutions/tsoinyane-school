import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { Grade } from '../grades/grade';
import { CollectionReport } from './collection-report';
import { OutstandingReport } from './outstanding-report';
import { PaymentSummary } from './payment-summary';
import { PaymentMethodBreakdown } from './payment-method-breakdown';
import { ReversedPaymentReport } from './reversed-payment-report';
import { FeeStudent } from './fee-student';
import { StudentPaymentSummary } from './student-payment-summary';
import { FeePayment } from './fee-payment';
import { InstallmentPlan } from './installment-plan';
import { Router } from '@angular/router';

@Component({
  selector: 'app-fee-reports',
  standalone: false,
  templateUrl: './fee-reports.html',
  styleUrl: './fee-reports.scss',
})
export class FeeReports implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  activeTab: 'summary' | 'collections' | 'outstanding' | 'methods' | 'reversed' | 'statement' | 'installments' = 'summary';

  fromDate = '';
  toDate = '';
  selectedGradeFilter: number | null = null;
  selectedStudentId: number | null = null;

  paymentSummary: PaymentSummary | null = null;
  collectionReports: CollectionReport[] = [];
  outstandingReports: OutstandingReport[] = [];
  paymentMethodBreakdown: PaymentMethodBreakdown[] = [];
  reversedReports: ReversedPaymentReport[] = [];
  studentStatement: StudentPaymentSummary | null = null;
  studentStatementHistory: FeePayment[] = [];
  installmentPlans: InstallmentPlan[] = [];
  gradeOptions: Grade[] = [];
  students: FeeStudent[] = [];
  selectedInstallmentStatusFilter = 'ALL';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.initializeDates();
        this.loadLookups();
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: 'summary' | 'collections' | 'outstanding' | 'methods' | 'reversed' | 'statement' | 'installments'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.loadData();
  }

  onFiltersChanged(): void {
    this.loadData();
  }

  exportCollectionsCsv(): void {
    const headers = ['Date', 'Total Collected', 'Payment Count', 'Cash', 'Bank', 'Mobile'];
    const rows = this.collectionReports.map(report => [
      report.date,
      report.totalCollected.toFixed(2),
      report.paymentCount.toString(),
      report.cashAmount.toFixed(2),
      report.bankAmount.toFixed(2),
      report.mobileAmount.toFixed(2),
    ]);
    this.downloadCsv('daily-collections.csv', headers, rows);
  }

  exportOutstandingCsv(): void {
    const headers = ['Grade', 'Total Students', 'Students with Outstanding', 'Total Outstanding', 'Average Outstanding'];
    const rows = this.outstandingReports.map(report => [
      report.gradeName,
      report.totalStudents.toString(),
      report.studentsWithOutstanding.toString(),
      report.totalOutstanding.toFixed(2),
      report.averageOutstanding.toFixed(2),
    ]);
    this.downloadCsv('outstanding-by-grade.csv', headers, rows);
  }

  exportPaymentMethodsCsv(): void {
    const headers = ['Payment Method', 'Total Amount', 'Payment Count', 'Average Amount', 'Share Of Total (%)'];
    const rows = this.paymentMethodBreakdown.map(report => [
      this.formatPaymentMethod(report.paymentMethod),
      report.totalAmount.toFixed(2),
      report.paymentCount.toString(),
      report.averageAmount.toFixed(2),
      report.percentageOfTotal.toFixed(2),
    ]);
    this.downloadCsv('payment-method-breakdown.csv', headers, rows);
  }

  exportReversedCsv(): void {
    const headers = ['Reversed At', 'Payment Date', 'Student', 'Student No.', 'Grade', 'Term', 'Academic Year', 'Method', 'Amount', 'Reference', 'Reason'];
    const rows = this.reversedReports.map(report => [
      report.reversedAt ?? '',
      report.paymentDate,
      report.studentName,
      report.studentNumber,
      report.gradeName ?? '',
      this.getTermLabel(report.term),
      report.academicYear ?? '',
      this.formatPaymentMethod(report.paymentMethod),
      report.amount.toFixed(2),
      report.referenceNumber ?? '',
      report.reversalReason ?? '',
    ]);
    this.downloadCsv('reversed-payments.csv', headers, rows);
  }

  exportStudentStatementCsv(): void {
    if (!this.studentStatement) {
      return;
    }

    const headers = ['Term', 'Academic Year', 'Total Fee', 'Total Paid', 'Balance', 'Status', 'Payment Count'];
    const rows = this.studentStatement.termSummaries.map(summary => [
      this.getTermLabel(summary.term),
      summary.academicYear,
      summary.totalFee.toFixed(2),
      summary.totalPaid.toFixed(2),
      summary.balance.toFixed(2),
      summary.status,
      summary.paymentCount.toString(),
    ]);
    this.downloadCsv(`learner-statement-${this.studentStatement.studentNumber}.csv`, headers, rows);
  }

  viewInstallmentPlan(plan: InstallmentPlan): void {
    this.router.navigate(['/admin/fees/installments', plan.id]);
  }

  get filteredInstallmentPlans(): InstallmentPlan[] {
    return this.installmentPlans
      .filter(p => !this.selectedGradeFilter || p.gradeId === this.selectedGradeFilter)
      .filter(p => this.selectedInstallmentStatusFilter === 'ALL' || p.status === this.selectedInstallmentStatusFilter);
  }

  get installmentTotalAmount(): number {
    return this.filteredInstallmentPlans.reduce((sum, p) => sum + p.totalAmount, 0);
  }

  get installmentTotalPaid(): number {
    return this.filteredInstallmentPlans.reduce((sum, p) =>
      sum + p.installments.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0), 0);
  }

  get installmentTotalOutstanding(): number {
    return this.installmentTotalAmount - this.installmentTotalPaid;
  }

  getInstallmentPaidAmount(plan: InstallmentPlan): number {
    return (plan.installments ?? [])
      .filter(installment => installment.status === 'PAID')
      .reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);
  }

  getInstallmentRemainingAmount(plan: InstallmentPlan): number {
    return Number(plan.totalAmount ?? 0) - this.getInstallmentPaidAmount(plan);
  }

  getInstallmentPlanProgress(plan: InstallmentPlan): { paidCount: number; totalCount: number; percentage: number } {
    const installments = plan.installments ?? [];
    const paidCount = installments.filter(installment => installment.status === 'PAID').length;
    const totalCount = installments.length;
    const percentage = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
    return { paidCount, totalCount, percentage };
  }

  printStudentStatement(): void {
    window.print();
  }

  formatCurrency(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  formatPercentage(value: number): string {
    return `${Number(value ?? 0).toFixed(1)}%`;
  }

  formatPaymentMethod(value: string | null | undefined): string {
    return String(value ?? 'N/A').replace('_', ' ');
  }

  getTermLabel(term: string | null | undefined): string {
    return String(term ?? '').replace('_', ' ');
  }

  private initializeDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.fromDate = firstDayOfMonth.toISOString().slice(0, 10);
    this.toDate = today.toISOString().slice(0, 10);
  }

  private loadLookups(): void {
    if (!this.selectedSchoolId) {
      this.gradeOptions = [];
      this.students = [];
      return;
    }

    this.backendService.get<Grade[]>('grade').subscribe({
      next: grades => {
        this.gradeOptions = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      },
      error: () => {
        this.gradeOptions = [];
      },
    });

    this.backendService.get<FeeStudent[]>('student', { schoolId: this.selectedSchoolId }).subscribe({
      next: students => {
        this.students = (students ?? []).sort((left, right) =>
          String(left.userFullName ?? '').localeCompare(String(right.userFullName ?? ''))
        );
      },
      error: () => {
        this.students = [];
      },
    });
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.resetData();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    switch (this.activeTab) {
      case 'summary':
        this.loadPaymentSummary();
        break;
      case 'collections':
        this.loadCollectionReports();
        break;
      case 'outstanding':
        this.loadOutstandingReports();
        break;
      case 'methods':
        this.loadPaymentMethodBreakdown();
        break;
      case 'reversed':
        this.loadReversedReports();
        break;
      case 'statement':
        this.loadStudentStatement();
        break;
      case 'installments':
        this.loadInstallmentPlans();
        break;
    }
  }

  private loadPaymentSummary(): void {
    this.backendService.get<PaymentSummary>('fee-payment/reports/summary', { schoolId: this.selectedSchoolId! }).subscribe({
      next: summary => {
        this.paymentSummary = summary;
      },
      error: () => {
        this.paymentSummary = null;
        this.errorMessage = 'Failed to load payment summary.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadCollectionReports(): void {
    this.backendService.get<CollectionReport[]>('fee-payment/reports/collections', this.buildDateRangeParams()).subscribe({
      next: reports => {
        this.collectionReports = reports ?? [];
      },
      error: () => {
        this.collectionReports = [];
        this.errorMessage = 'Failed to load collection reports.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadOutstandingReports(): void {
    const params: Record<string, string | number> = { schoolId: this.selectedSchoolId! };
    if (this.selectedGradeFilter) {
      params['gradeId'] = this.selectedGradeFilter;
    }

    this.backendService.get<OutstandingReport[]>('fee-payment/reports/outstanding', params).subscribe({
      next: reports => {
        this.outstandingReports = reports ?? [];
      },
      error: () => {
        this.outstandingReports = [];
        this.errorMessage = 'Failed to load outstanding reports.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadPaymentMethodBreakdown(): void {
    this.backendService.get<PaymentMethodBreakdown[]>('fee-payment/reports/payment-methods', this.buildDateRangeParams()).subscribe({
      next: reports => {
        this.paymentMethodBreakdown = reports ?? [];
      },
      error: () => {
        this.paymentMethodBreakdown = [];
        this.errorMessage = 'Failed to load payment method breakdown.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadReversedReports(): void {
    this.backendService.get<ReversedPaymentReport[]>('fee-payment/reports/reversed', this.buildDateRangeParams()).subscribe({
      next: reports => {
        this.reversedReports = (reports ?? []).map(report => ({
          ...report,
          amount: Number(report.amount ?? 0),
        }));
      },
      error: () => {
        this.reversedReports = [];
        this.errorMessage = 'Failed to load reversed payment reports.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadStudentStatement(): void {
    if (!this.selectedStudentId) {
      this.studentStatement = null;
      this.studentStatementHistory = [];
      this.isLoading = false;
      return;
    }

    forkJoin({
      summary: this.backendService.get<StudentPaymentSummary>(`fee-payment/student/${this.selectedStudentId}/statement`, {
        schoolId: this.selectedSchoolId!,
      }),
      history: this.backendService.get<FeePayment[]>(`fee-payment/student/${this.selectedStudentId}/history`, {
        schoolId: this.selectedSchoolId!,
        includeReversed: true,
      }),
    }).subscribe({
      next: ({ summary, history }) => {
        this.studentStatement = summary;
        this.studentStatementHistory = (history ?? []).map(payment => ({
          ...payment,
          amount: Number(payment.amount ?? 0),
          totalFee: Number(payment.totalFee ?? 0),
          totalPaid: Number(payment.totalPaid ?? 0),
          balance: Number(payment.balance ?? 0),
        }));
      },
      error: () => {
        this.studentStatement = null;
        this.studentStatementHistory = [];
        this.errorMessage = 'Failed to load learner statement.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadInstallmentPlans(): void {
    this.backendService.get<InstallmentPlan[]>('installment-plan', { schoolId: this.selectedSchoolId! }).subscribe({
      next: plans => {
        this.installmentPlans = (plans ?? []).map(plan => ({
          ...plan,
          totalAmount: Number(plan.totalAmount ?? 0),
          installments: (plan.installments ?? []).map(i => ({
            ...i,
            amount: Number(i.amount ?? 0),
            paidAmount: Number(i.paidAmount ?? 0),
          })),
        }));
      },
      error: () => {
        this.installmentPlans = [];
        this.errorMessage = 'Failed to load installment plans.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private buildDateRangeParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {
      schoolId: this.selectedSchoolId!,
      fromDate: this.fromDate,
      toDate: this.toDate,
    };

    if (this.selectedGradeFilter) {
      params['gradeId'] = this.selectedGradeFilter;
    }

    return params;
  }

  private resetData(): void {
    this.paymentSummary = null;
    this.collectionReports = [];
    this.outstandingReports = [];
    this.paymentMethodBreakdown = [];
    this.reversedReports = [];
    this.studentStatement = null;
    this.studentStatementHistory = [];
    this.installmentPlans = [];
    this.gradeOptions = [];
    this.students = [];
    this.isLoading = false;
  }

  private downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(value => this.escapeCsvValue(value)).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private escapeCsvValue(value: string | number): string {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }
}
