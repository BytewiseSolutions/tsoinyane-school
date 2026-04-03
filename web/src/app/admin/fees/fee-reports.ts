import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { Grade } from '../grades/grade';
import { CollectionReport } from './collection-report';
import { OutstandingReport } from './outstanding-report';
import { PaymentSummary } from './payment-summary';

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
  activeTab: 'summary' | 'collections' | 'outstanding' = 'summary';
  
  fromDate = '';
  toDate = '';
  selectedGradeFilter: number | null = null;
  
  paymentSummary: PaymentSummary | null = null;
  collectionReports: CollectionReport[] = [];
  outstandingReports: OutstandingReport[] = [];
  gradeOptions: Grade[] = [];

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
        this.initializeDates();
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: 'summary' | 'collections' | 'outstanding'): void {
    this.activeTab = tab;
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

  formatCurrency(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  private initializeDates(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.fromDate = firstDayOfMonth.toISOString().slice(0, 10);
    this.toDate = today.toISOString().slice(0, 10);
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.resetData();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Load grades
    this.backendService.get<Grade[]>('grade').subscribe({
      next: grades => {
        this.gradeOptions = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      },
      error: () => { this.gradeOptions = []; },
    });

    // Load data based on active tab
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
    }
  }

  private loadPaymentSummary(): void {
    if (!this.selectedSchoolId) {
      this.paymentSummary = null;
      this.isLoading = false;
      return;
    }

    const params = { schoolId: this.selectedSchoolId };
    
    this.backendService.get<PaymentSummary>('fee-payment/reports/summary', params).subscribe({
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
    if (!this.selectedSchoolId) {
      this.collectionReports = [];
      this.isLoading = false;
      return;
    }

    const params: Record<string, string | number> = { 
      schoolId: this.selectedSchoolId,
      fromDate: this.fromDate,
      toDate: this.toDate
    };
    
    if (this.selectedGradeFilter) {
      params['gradeId'] = this.selectedGradeFilter;
    }

    this.backendService.get<CollectionReport[]>('fee-payment/reports/collections', params).subscribe({
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
    if (!this.selectedSchoolId) {
      this.outstandingReports = [];
      this.isLoading = false;
      return;
    }

    const params: Record<string, string | number> = { schoolId: this.selectedSchoolId };
    
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

  private resetData(): void {
    this.paymentSummary = null;
    this.collectionReports = [];
    this.outstandingReports = [];
    this.gradeOptions = [];
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
