import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { FeePayment } from '../fee-payment';
import { FeeReceiptService } from '../fee-receipt.service';

interface LearnerHistoryGroup {
  key: string;
  label: string;
  totalFee: number;
  totalPaid: number;
  balance: number;
  status: 'paid' | 'outstanding';
  payments: FeePayment[];
}

@Component({
  selector: 'app-fee-payment-detail',
  standalone: false,
  templateUrl: './fee-payment-detail.html',
  styleUrl: './fee-payment-detail.scss',
})
export class FeePaymentDetail implements OnInit {
  payment: FeePayment | null = null;
  learnerHistory: FeePayment[] = [];
  isLoading = true;
  isLoadingHistory = false;
  isReversing = false;
  showReversalDialog = false;
  reversalReason = '';
  reversalError = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private location: Location,
    private feeReceiptService: FeeReceiptService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage = 'Invalid fee payment.';
      this.isLoading = false;
      return;
    }

    this.backendService.get<FeePayment>(`fee-payment/${id}`).subscribe({
      next: payment => {
        this.payment = {
          ...payment,
          amount: Number(payment.amount ?? 0),
          totalFee: Number(payment.totalFee ?? 0),
          totalPaid: Number(payment.totalPaid ?? 0),
          balance: Number(payment.balance ?? 0),
        };
        this.loadLearnerHistory(this.payment.schoolId ?? null, this.payment.studentId ?? null);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee payment.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  getTermLabel(term: string | null | undefined): string {
    return String(term ?? '').replace('_', ' ');
  }

  formatCurrency(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  get historyGroups(): LearnerHistoryGroup[] {
    const grouped = new Map<string, FeePayment[]>();

    this.learnerHistory.forEach(payment => {
      const key = `${payment.term ?? 'N/A'}-${payment.academicYear ?? 'N/A'}`;
      const payments = grouped.get(key) ?? [];
      payments.push(payment);
      grouped.set(key, payments);
    });

    return [...grouped.entries()]
      .map(([key, payments]) => {
        const recordStates = new Map<string, FeePayment>();

        payments.forEach(payment => {
          const recordKey = `${payment.feeStructureId ?? 0}`;
          const current = recordStates.get(recordKey);
          if (!current || this.toTimestamp(payment) > this.toTimestamp(current)) {
            recordStates.set(recordKey, payment);
          }
        });

        const totalFee = [...recordStates.values()].reduce((sum, payment) => sum + Number(payment.totalFee ?? 0), 0);
        const totalPaid = [...recordStates.values()].reduce((sum, payment) => sum + Number(payment.totalPaid ?? 0), 0);
        const balance = [...recordStates.values()].reduce((sum, payment) => sum + Number(payment.balance ?? 0), 0);
        const [term, academicYear] = key.split('-', 2);

        return {
          key,
          label: `${this.getTermLabel(term)} • ${academicYear}`,
          totalFee: Number(totalFee.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          balance: Number(balance.toFixed(2)),
          status: (balance <= 0 ? 'paid' : 'outstanding') as 'paid' | 'outstanding',
          payments: [...payments].sort((left, right) => this.toTimestamp(right) - this.toTimestamp(left)),
        };
      })
      .sort((left, right) => {
        const latestLeft = left.payments[0];
        const latestRight = right.payments[0];
        return this.toTimestamp(latestRight) - this.toTimestamp(latestLeft);
      });
  }

  get paymentStatus(): 'paid' | 'outstanding' {
    return Number(this.payment?.balance ?? 0) <= 0 ? 'paid' : 'outstanding';
  }

  get paymentStatusLabel(): string {
    return this.paymentStatus === 'paid' ? 'Fully Paid' : 'Outstanding';
  }

  printReceipt(): void {
    if (!this.payment) {
      return;
    }

    this.feeReceiptService.printReceipt(this.payment);
  }

  openReversalDialog(): void {
    this.reversalReason = '';
    this.reversalError = '';
    this.showReversalDialog = true;
  }

  closeReversalDialog(): void {
    this.showReversalDialog = false;
    this.reversalReason = '';
    this.reversalError = '';
  }

  confirmReversal(): void {
    if (!this.reversalReason.trim()) {
      this.reversalError = 'Reversal reason is required.';
      return;
    }

    if (!this.payment?.id) {
      return;
    }

    this.isReversing = true;
    this.reversalError = '';

    const body: { reason: string } = { reason: this.reversalReason.trim() };
    (this.backendService.post as <T, B>(endpoint: string, body: B) => Observable<T>)<FeePayment, { reason: string }>(
      `fee-payment/${this.payment.id}/reverse`,
      body
    ).subscribe({
      next: updated => {
        this.payment = {
          ...updated,
          amount: Number(updated.amount ?? 0),
          totalFee: Number(updated.totalFee ?? 0),
          totalPaid: Number(updated.totalPaid ?? 0),
          balance: Number(updated.balance ?? 0),
        };
        this.closeReversalDialog();
        this.loadLearnerHistory(this.payment.schoolId ?? null, this.payment.studentId ?? null);
      },
      error: (error: HttpErrorResponse) => {
        this.reversalError = error.error?.message || 'Failed to reverse payment.';
      },
      complete: () => {
        this.isReversing = false;
      },
    });
  }

  private loadLearnerHistory(schoolId: number | null, studentId: number | null): void {
    if (!schoolId || !studentId) {
      this.learnerHistory = [];
      return;
    }

    this.isLoadingHistory = true;

    this.backendService.get<FeePayment[]>('fee-payment', { schoolId }).subscribe({
      next: payments => {
        this.learnerHistory = (payments ?? [])
          .map(payment => ({
            ...payment,
            amount: Number(payment.amount ?? 0),
            totalFee: Number(payment.totalFee ?? 0),
            totalPaid: Number(payment.totalPaid ?? 0),
            balance: Number(payment.balance ?? 0),
          }))
          .filter(payment => payment.studentId === studentId);
      },
      error: () => {
        this.learnerHistory = [];
      },
      complete: () => {
        this.isLoadingHistory = false;
      },
    });
  }

  private toTimestamp(payment: FeePayment): number {
    const paymentDate = payment.paymentDate ? new Date(`${payment.paymentDate}T00:00:00`).getTime() : 0;
    const createdAt = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
    return Math.max(paymentDate, createdAt);
  }
}
