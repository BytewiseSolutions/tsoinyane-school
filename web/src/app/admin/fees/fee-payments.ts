import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { Grade } from '../grades/grade';
import { SchoolContextService } from '../layout/school-context';
import { Term } from '../settings/term';
import { FeePayment } from './fee-payment';
import { FeeReceiptService } from './fee-receipt.service';
import { FeeStudent } from './fee-student';
import { FeeStructure } from './fee-structure';

interface SchoolFeeContext {
  id: number;
  academicYear?: string | null;
  currentTerm?: Term | null;
}

interface OutstandingFeeRecord {
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeName: string;
  term: string;
  totalFee: number;
  totalPaid: number;
  balance: number;
  paymentCount: number;
}

interface OutstandingLearnerRow {
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeName: string;
  terms: string;
  totalFee: number;
  totalPaid: number;
  balance: number;
  paymentCount: number;
}

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
  selectedAcademicYear = '';
  currentSchoolTerm: Term | null = null;
  payments: FeePayment[] = [];
  students: FeeStudent[] = [];
  feeStructures: FeeStructure[] = [];
  gradeOptions: Grade[] = [];
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
        if (!query) {
          return true;
        }

        return (payment.studentName ?? '').toLowerCase().includes(query)
          || (payment.studentNumber ?? '').toLowerCase().includes(query)
          || (payment.gradeName ?? '').toLowerCase().includes(query)
          || (payment.academicYear ?? '').toLowerCase().includes(query)
          || (payment.referenceNumber ?? '').toLowerCase().includes(query);
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
    const total = this.outstandingRecords.reduce((sum, record) => sum + Number(record.balance ?? 0), 0);
    return this.formatCurrency(total);
  }

  get outstandingRecords(): OutstandingFeeRecord[] {
    const paymentsByRecord = new Map<string, FeePayment[]>();

    this.payments.forEach(payment => {
      const key = this.getPaymentRecordKey(payment.studentId, payment.feeStructureId);
      if (!key) {
        return;
      }

      const existing = paymentsByRecord.get(key) ?? [];
      existing.push(payment);
      paymentsByRecord.set(key, existing);
    });

    const records: OutstandingFeeRecord[] = [];

    this.filteredStudents.forEach(student => {
      const matchingStructures = this.feeStructures
        .filter(structure => structure.schoolId === this.selectedSchoolId)
        .filter(structure => structure.gradeId === student.gradeId)
        .filter(structure => this.isStructureInCurrentAcademicYear(structure))
        .filter(structure => this.isOverdueTerm(structure.term))
        .filter(structure => this.selectedTermFilter === 'ALL' || structure.term === this.selectedTermFilter);

      matchingStructures.forEach(structure => {
        const totalFee = Number(structure.totalAmount ?? structure.amount ?? 0);
        if (totalFee <= 0) {
          return;
        }

        const key = this.getPaymentRecordKey(student.id, structure.id);
        const payments = key ? (paymentsByRecord.get(key) ?? []) : [];
        const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
        const balance = Number((totalFee - totalPaid).toFixed(2));

        if (balance <= 0.009) {
          return;
        }

        records.push({
          studentId: student.id,
          studentName: student.userFullName || 'Unknown Student',
          studentNumber: student.studentNumber || 'N/A',
          gradeName: student.gradeName || 'N/A',
          term: this.getTermLabel(structure.term),
          totalFee: Number(totalFee.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          balance,
          paymentCount: payments.length,
        });
      });
    });

    return records.sort((left, right) => right.balance - left.balance);
  }

  get outstandingLearners(): OutstandingLearnerRow[] {
    const grouped = new Map<number, OutstandingLearnerRow & { termSet: Set<string> }>();

    this.outstandingRecords.forEach(record => {
        const current = grouped.get(record.studentId) ?? {
          studentId: record.studentId,
          studentName: record.studentName,
          studentNumber: record.studentNumber,
          gradeName: record.gradeName,
          terms: '',
          totalFee: 0,
          totalPaid: 0,
          balance: 0,
          paymentCount: 0,
          termSet: new Set<string>(),
        };

        current.totalFee += record.totalFee;
        current.totalPaid += record.totalPaid;
        current.balance += record.balance;
        current.paymentCount += record.paymentCount;
        current.termSet.add(record.term);

        grouped.set(record.studentId, current);
      });

    return [...grouped.values()]
      .map(item => ({
        studentId: item.studentId,
        studentName: item.studentName,
        studentNumber: item.studentNumber,
        gradeName: item.gradeName,
        terms: [...item.termSet].join(', ') || 'N/A',
        totalFee: Number(item.totalFee.toFixed(2)),
        totalPaid: Number(item.totalPaid.toFixed(2)),
        balance: Number(item.balance.toFixed(2)),
        paymentCount: item.paymentCount,
      }))
      .sort((left, right) => right.balance - left.balance);
  }

  get paginatedPayments(): FeePayment[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.filteredPayments.slice(start, start + this.pageSize);
  }

  get paginatedOutstandingLearners(): OutstandingLearnerRow[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.outstandingLearners.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.outstandingLearners.length;
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.outstandingLearners.length;

    if (!totalItems) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    const totalItems = this.activeView === 'payments'
      ? this.filteredPayments.length
      : this.outstandingLearners.length;
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

  openFormForOutstandingLearner(learner: OutstandingLearnerRow): void {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing fee payments.';
      return;
    }

    const student = this.students.find(s => s.id === learner.studentId);
    const outstandingRecordsForLearner = this.outstandingRecords.filter(r => r.studentId === learner.studentId);
    const firstRecord = outstandingRecordsForLearner[0];

    const matchingStructure = firstRecord
      ? this.feeStructures.find(structure =>
          structure.gradeId === student?.gradeId &&
          structure.schoolId === this.selectedSchoolId &&
          this.getTermLabel(structure.term) === firstRecord.term
        ) ?? null
      : null;

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
    if (!this.paymentToDelete?.id || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`fee-payment/${this.paymentToDelete.id}`).subscribe({
      next: () => {
        this.payments = this.payments.filter(payment => payment.id !== this.paymentToDelete?.id);
        this.cancelDelete();
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
    if (!payment.id) {
      return;
    }

    this.router.navigate(['/admin/fees/payments', payment.id]);
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
    const headers = ['Student No.', 'Student', 'Grade', 'Terms', 'Total Fee', 'Total Paid', 'Balance'];
    const rows = this.outstandingLearners.map(learner => [
      learner.studentNumber,
      learner.studentName,
      learner.gradeName,
      learner.terms,
      learner.totalFee.toFixed(2),
      learner.totalPaid.toFixed(2),
      learner.balance.toFixed(2),
    ]);

    this.downloadCsv('outstanding-fee-balances.csv', headers, rows);
  }

  viewLearnerHistory(studentId: number): void {
    const latestPayment = this.payments.find(payment => payment.studentId === studentId);

    if (latestPayment?.id) {
      this.viewPayment(latestPayment);
    }
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
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
    }
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.payments = [];
      this.students = [];
      this.feeStructures = [];
      this.gradeOptions = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

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
        this.students = students ?? [];
      },
      error: () => {
        this.students = [];
      },
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
      error: () => {
        this.feeStructures = [];
      },
    });

    this.backendService.get<FeePayment[]>('fee-payment', { schoolId: this.selectedSchoolId }).subscribe({
      next: payments => {
        this.payments = (payments ?? []).map(payment => this.normalizePayment(payment));
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee payments.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });

    this.backendService.get<SchoolFeeContext[]>('school').subscribe({
      next: schools => {
        const selectedSchool = (schools ?? []).find(school => school.id === this.selectedSchoolId);
        this.selectedAcademicYear = selectedSchool?.academicYear ?? '';
        this.currentSchoolTerm = selectedSchool?.currentTerm ?? null;
      },
      error: () => {
        this.selectedAcademicYear = '';
        this.currentSchoolTerm = null;
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

  private get filteredStudents(): FeeStudent[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.students
      .filter(student => !this.selectedGradeFilter || student.gradeId === this.selectedGradeFilter)
      .filter(student => {
        if (!query) {
          return true;
        }

        return (student.userFullName ?? '').toLowerCase().includes(query)
          || (student.studentNumber ?? '').toLowerCase().includes(query)
          || (student.gradeName ?? '').toLowerCase().includes(query);
      });
  }

  private isStructureInCurrentAcademicYear(structure: FeeStructure): boolean {
    if (!this.selectedAcademicYear) {
      return true;
    }

    return structure.academicYear === this.selectedAcademicYear;
  }

  private isOverdueTerm(term: Term | null): boolean {
    if (!term || !this.currentSchoolTerm) {
      return false;
    }

    return this.getTermOrder(term) <= this.getTermOrder(this.currentSchoolTerm);
  }

  private getPaymentRecordKey(studentId: number | null | undefined, feeStructureId: number | null | undefined): string | null {
    if (!studentId || !feeStructureId) {
      return null;
    }

    return `${studentId}-${feeStructureId}`;
  }

  private getTermOrder(term: Term | string | null | undefined): number {
    switch (term) {
      case Term.TERM_1:
      case 'TERM_1':
        return 1;
      case Term.TERM_2:
      case 'TERM_2':
        return 2;
      case Term.TERM_3:
      case 'TERM_3':
        return 3;
      case Term.TERM_4:
      case 'TERM_4':
        return 4;
      default:
        return 99;
    }
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
