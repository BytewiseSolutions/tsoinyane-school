import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { Grade } from '../grades/grade';
import { SchoolContextService } from '../layout/school-context';
import { FeePayment } from './fee-payment';
import { FeeReceiptService } from './fee-receipt.service';
import { FeeStudent } from './fee-student';
import { FeeStructure } from './fee-structure';
import { GradeOutstandingSummary } from './grade-outstanding-summary';
import { OutstandingLearner } from './outstanding-learner';
import { OutstandingSummary } from './outstanding-summary';

@Component({
  selector: 'app-fee-payments',
  standalone: false,
  templateUrl: './fee-payments.html',
  styleUrl: './fee-payments.scss',
})
export class FeePayments implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  actionMessage = '';
  searchTerm = '';
  activeView: 'payments' | 'outstanding' = 'payments';
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];
  selectedGradeFilter: number | null = null;
  selectedTermFilter = 'ALL';
  payments: FeePayment[] = [];
  students: FeeStudent[] = [];
  feeStructures: FeeStructure[] = [];
  gradeOptions: Grade[] = [];
  outstandingLearners: OutstandingLearner[] = [];
  gradeSummary: GradeOutstandingSummary[] = [];
  showForm = false;
  editingPayment: FeePayment | null = null;
  preferredStudentId: number | null = null;
  preferredFeeStructureId: number | null = null;
  showDeleteDialog = false;
  paymentToDelete: FeePayment | null = null;

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private feeReceiptService: FeeReceiptService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadData();
      });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        filter(event => (event as NavigationEnd).urlAfterRedirects === '/admin/fees/payments'),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadOutstanding();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredPayments(): FeePayment[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.payments
      .filter(payment => !this.selectedGradeFilter || payment.gradeId === this.selectedGradeFilter)
      .filter(payment => this.selectedTermFilter === 'ALL' || payment.term === this.selectedTermFilter)
      .filter(payment => {
        if (!query) return true;
        return (payment.studentName ?? '').toLowerCase().includes(query)
          || (payment.studentNumber ?? '').toLowerCase().includes(query)
          || (payment.gradeName ?? '').toLowerCase().includes(query)
          || (payment.academicYear ?? '').toLowerCase().includes(query)
          || (payment.referenceNumber ?? '').toLowerCase().includes(query);
      });
  }

  get filteredOutstandingLearners(): OutstandingLearner[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.outstandingLearners
      .filter(l => !this.selectedGradeFilter || l.gradeId === this.selectedGradeFilter)
      .filter(l => {
        if (!query) return true;
        return (l.studentName ?? '').toLowerCase().includes(query)
          || (l.studentNumber ?? '').toLowerCase().includes(query)
          || (l.gradeName ?? '').toLowerCase().includes(query);
      });
  }

  get totalCollected(): string {
    const total = this.filteredPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
    return this.formatCurrency(total);
  }

  get paymentsCount(): number {
    return this.filteredPayments.length;
  }

  get learnersWithPaymentsCount(): number {
    return new Set(this.filteredPayments.map(payment => payment.studentId).filter(Boolean)).size;
  }

  get outstandingBalance(): string {
    const total = this.filteredOutstandingLearners.reduce((sum, l) => sum + Number(l.balance ?? 0), 0);
    return this.formatCurrency(total);
  }

  get gradeOutstandingSummary(): GradeOutstandingSummary[] {
    return this.gradeSummary;
  }

  get paginatedPayments(): FeePayment[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.filteredPayments.slice(start, start + this.pageSize);
  }

  get paginatedOutstandingLearners(): OutstandingLearner[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.filteredOutstandingLearners.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.filteredOutstandingLearners.length;
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.filteredOutstandingLearners.length;
    if (!totalItems) return 0;
    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.filteredOutstandingLearners.length;
    return Math.min(this.safeCurrentPage * this.pageSize, totalItems);
  }

  openForm(payment: FeePayment | null = null): void {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing fee payments.';
      return;
    }
    this.errorMessage = '';
    this.editingPayment = payment ? { ...payment } : null;
    this.preferredStudentId = payment?.studentId ?? null;
    this.preferredFeeStructureId = null;
    this.showForm = true;
  }

  openFormForOutstandingLearner(learner: OutstandingLearner): void {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing fee payments.';
      return;
    }

    const student = this.students.find(s => s.id === learner.studentId);
    const matchingStructure = this.feeStructures.find(structure =>
      structure.gradeId === student?.gradeId &&
      structure.schoolId === this.selectedSchoolId
    ) ?? null;

    this.errorMessage = '';
    this.editingPayment = null;
    this.preferredStudentId = learner.studentId;
    this.preferredFeeStructureId = matchingStructure?.id ?? null;
    this.showForm = true;
  }

  selectView(view: 'payments' | 'outstanding'): void {
    this.activeView = view;
    this.currentPage = 1;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingPayment = null;
    this.preferredStudentId = null;
    this.preferredFeeStructureId = null;
  }

  closeActionMessage(): void {
    this.actionMessage = '';
  }

  savePayment(payment: FeePayment): void {
    const isEdit = !!this.editingPayment?.id;
    const request$ = isEdit
      ? this.backendService.put<FeePayment, FeePayment>(`fee-payment/${this.editingPayment!.id}`, payment)
      : this.backendService.post<FeePayment, FeePayment>('fee-payment', payment);

    this.isProcessing = true;
    this.errorMessage = '';

    request$.subscribe({
      next: savedPayment => {
        const normalizedPayment = this.normalizePayment(savedPayment);
        if (isEdit) {
          this.payments = this.payments.map(item => item.id === normalizedPayment.id ? normalizedPayment : item);
          this.closeForm();
          this.actionMessage = 'Fee payment updated successfully.';
        } else {
          this.payments = [normalizedPayment, ...this.payments.filter(item => item.id !== normalizedPayment.id)];
          this.closeForm();
          this.loadOutstanding();
          this.feeReceiptService.printReceipt(normalizedPayment);
          if (normalizedPayment.id) {
            this.router.navigate(['/admin/fees/payments', normalizedPayment.id]);
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to save fee payment.';
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  confirmDelete(payment: FeePayment): void {
    this.paymentToDelete = payment;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.paymentToDelete = null;
    this.showDeleteDialog = false;
  }

  deletePayment(): void {
    if (!this.paymentToDelete?.id || this.isProcessing) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`fee-payment/${this.paymentToDelete.id}`).subscribe({
      next: () => {
        this.payments = this.payments.filter(payment => payment.id !== this.paymentToDelete?.id);
        this.cancelDelete();
        this.loadOutstanding();
        this.actionMessage = 'Fee payment deleted successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete fee payment.';
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  getTermLabel(term: string | null | undefined): string {
    return String(term ?? '').replace('_', ' ');
  }

  viewPayment(payment: FeePayment): void {
    if (!payment.id) return;
    this.router.navigate(['/admin/fees/payments', payment.id]);
  }

  viewLearnerHistory(studentId: number): void {
    const latestPayment = this.payments.find(payment => payment.studentId === studentId);
    if (latestPayment?.id) {
      this.viewPayment(latestPayment);
    }
  }

  exportPaymentsCsv(): void {
    const headers = ['Student No.', 'Student', 'Grade', 'Term', 'Payment Date', 'Method', 'Amount', 'Reference'];
    const rows = this.filteredPayments.map(payment => [
      payment.studentNumber || 'N/A',
      payment.studentName || 'Unknown Student',
      payment.gradeName || 'N/A',
      this.getTermLabel(payment.term),
      payment.paymentDate || '',
      payment.paymentMethod?.replace('_', ' ') || 'N/A',
      Number(payment.amount ?? 0).toFixed(2),
      payment.referenceNumber || '',
    ]);
    this.downloadCsv('fee-payments.csv', headers, rows);
  }

  exportOutstandingCsv(): void {
    const headers = ['Student No.', 'Student', 'Grade', 'Total Fee', 'Total Paid', 'Balance'];
    const rows = this.filteredOutstandingLearners.map(learner => [
      learner.studentNumber,
      learner.studentName,
      learner.gradeName,
      learner.totalFee.toFixed(2),
      learner.totalPaid.toFixed(2),
      learner.balance.toFixed(2),
    ]);
    this.downloadCsv('outstanding-fee-balances.csv', headers, rows);
  }

  formatCurrency(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  onFiltersChanged(): void {
    this.actionMessage = '';
    this.currentPage = 1;
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) this.currentPage = this.safeCurrentPage - 1;
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) this.currentPage = this.safeCurrentPage + 1;
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.payments = [];
      this.students = [];
      this.feeStructures = [];
      this.gradeOptions = [];
      this.outstandingLearners = [];
      this.gradeSummary = [];
      this.isLoading = false;
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

    this.backendService.get<FeeStudent[]>('student', { schoolId: this.selectedSchoolId }).subscribe({
      next: students => { this.students = students ?? []; },
      error: () => { this.students = []; },
    });

    this.backendService.get<FeeStructure[]>('fee-structure', { schoolId: this.selectedSchoolId }).subscribe({
      next: structures => {
        this.feeStructures = (structures ?? []).map(structure => ({
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          examFee: Number(structure.examFee ?? 0),
          amount: Number(structure.amount ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        }));
      },
      error: () => { this.feeStructures = []; },
    });

    this.backendService.get<FeePayment[]>('fee-payment', { schoolId: this.selectedSchoolId }).subscribe({
      next: payments => {
        this.payments = (payments ?? []).map(payment => this.normalizePayment(payment));
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee payments.';
      },
      complete: () => { this.isLoading = false; },
    });

    this.loadOutstanding();
  }

  private loadOutstanding(): void {
    if (!this.selectedSchoolId) return;

    this.backendService.get<OutstandingSummary>('fee-payment/outstanding', { schoolId: this.selectedSchoolId }).subscribe({
      next: summary => {
        this.outstandingLearners = summary?.learners ?? [];
        this.gradeSummary = summary?.gradeSummary ?? [];
      },
      error: () => {
        this.outstandingLearners = [];
        this.gradeSummary = [];
      },
    });
  }

  private normalizePayment(payment: FeePayment): FeePayment {
    return {
      ...payment,
      amount: Number(payment.amount ?? 0),
      totalFee: Number(payment.totalFee ?? 0),
      totalPaid: Number(payment.totalPaid ?? 0),
      balance: Number(payment.balance ?? 0),
    };
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
