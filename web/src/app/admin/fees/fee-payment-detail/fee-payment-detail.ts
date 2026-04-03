import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { FeePayment } from '../fee-payment';

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
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private location: Location,
    private schoolContext: SchoolContextService
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

    const receiptWindow = window.open('', '_blank', 'width=760,height=900');
    if (!receiptWindow) {
      return;
    }

    receiptWindow.document.write(this.buildReceiptHtml(this.payment));
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
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

  private buildReceiptHtml(payment: FeePayment): string {
    const receiptDate = payment.paymentDate ? new Date(`${payment.paymentDate}T00:00:00`) : null;
    const printableDate = receiptDate && !Number.isNaN(receiptDate.getTime())
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(receiptDate)
      : (payment.paymentDate || 'N/A');
    const issuedAt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
    const receiptNumber = `FP-${String(payment.id ?? 0).padStart(5, '0')}`;
    const schoolName = this.schoolContext.selectedSchool?.name || 'Tsoinyane School';
    const notes = payment.notes || 'No additional notes recorded.';
    const paymentMethod = payment.paymentMethod?.replace('_', ' ') || 'N/A';
    const referenceNumber = payment.referenceNumber || 'N/A';
    const totalFee = this.formatCurrency(payment.totalFee);
    const totalPaid = this.formatCurrency(payment.totalPaid);
    const balance = this.formatCurrency(payment.balance);
    const amountPaid = this.formatCurrency(payment.amount);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Payment Receipt</title>
  <style>
    :root {
      --navy: #001f5b;
      --navy-soft: #edf3ff;
      --text: #1f2f52;
      --muted: #5f6e8f;
      --border: #dbe5f5;
      --success: #1f8a49;
    }
    body {
      font-family: Arial, sans-serif;
      padding: 28px;
      color: var(--text);
      background: #f6f9ff;
    }
    .receipt {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 0;
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      overflow: hidden;
      box-shadow: 0 18px 40px rgba(15, 34, 68, 0.12);
    }
    .header {
      background: linear-gradient(135deg, var(--navy) 0%, #123b88 100%);
      color: #fff;
      padding: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .brand h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 0.02em;
    }
    .brand p {
      margin: 8px 0 0;
      color: rgba(255, 255, 255, 0.82);
      line-height: 1.5;
    }
    .school-name {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.82;
      margin-bottom: 8px;
    }
    .receipt-meta {
      min-width: 220px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .receipt-meta .meta-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.76;
      margin-bottom: 4px;
    }
    .receipt-meta .meta-value {
      display: block;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .body {
      padding: 24px 28px 28px;
    }
    .section {
      margin-bottom: 22px;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .section-title {
      margin: 0 0 12px;
      color: var(--navy);
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 18px;
      margin-bottom: 22px;
    }
    .amount-card,
    .balance-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      background: #fff;
    }
    .amount-card {
      background: linear-gradient(180deg, #ffffff 0%, var(--navy-soft) 100%);
    }
    .amount-card span,
    .balance-card span {
      display: block;
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }
    .amount-card strong {
      display: block;
      color: var(--navy);
      font-size: 36px;
      line-height: 1.1;
    }
    .balance-row {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .balance-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .balance-row strong {
      font-size: 15px;
    }
    .balance-row.balance-due strong {
      color: var(--success);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 18px;
    }
    .item {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
    }
    .item span {
      display: block;
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .item strong {
      font-size: 16px;
    }
    .notes {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      background: #fff;
      line-height: 1.6;
      color: var(--text);
    }
    .footer {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px dashed var(--border);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .receipt {
        box-shadow: none;
      }
    }
    @media (max-width: 760px) {
      .header,
      .hero,
      .grid,
      .footer {
        grid-template-columns: 1fr;
        display: grid;
      }
      .header {
        gap: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="brand">
        <div class="school-name">${schoolName}</div>
        <h1>Fee Payment Receipt</h1>
        <p>Official confirmation of a recorded learner fee payment.</p>
      </div>
      <div class="receipt-meta">
        <span class="meta-label">Receipt No.</span>
        <span class="meta-value">${receiptNumber}</span>
        <span class="meta-label">Issued</span>
        <span class="meta-value">${issuedAt}</span>
      </div>
    </div>
    <div class="body">
      <div class="hero">
        <div class="amount-card">
          <span>Amount Paid</span>
          <strong>${amountPaid}</strong>
        </div>
        <div class="balance-card">
          <div class="balance-row">
            <span>Total Fee</span>
            <strong>${totalFee}</strong>
          </div>
          <div class="balance-row">
            <span>Total Paid</span>
            <strong>${totalPaid}</strong>
          </div>
          <div class="balance-row balance-due">
            <span>Balance</span>
            <strong>${balance}</strong>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Learner Details</h2>
        <div class="grid">
          <div class="item"><span>Student No.</span><strong>${payment.studentNumber || 'N/A'}</strong></div>
          <div class="item"><span>Student</span><strong>${payment.studentName || 'Unknown Student'}</strong></div>
          <div class="item"><span>Grade</span><strong>${payment.gradeName || 'N/A'}</strong></div>
          <div class="item"><span>Academic Year</span><strong>${payment.academicYear || 'N/A'}</strong></div>
          <div class="item"><span>Term</span><strong>${this.getTermLabel(payment.term)}</strong></div>
          <div class="item"><span>Payment Date</span><strong>${printableDate}</strong></div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Payment Details</h2>
        <div class="grid">
          <div class="item"><span>Payment Method</span><strong>${paymentMethod}</strong></div>
          <div class="item"><span>Reference Number</span><strong>${referenceNumber}</strong></div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Notes</h2>
        <div class="notes">${notes}</div>
      </div>

      <div class="footer">
        <div>This receipt was generated from the school fee payments system.</div>
        <div>Please keep this document for your payment records.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
