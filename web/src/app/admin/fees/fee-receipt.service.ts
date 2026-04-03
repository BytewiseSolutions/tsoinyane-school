import { Injectable } from '@angular/core';
import { SchoolContextService } from '../layout/school-context';
import { FeePayment } from './fee-payment';

@Injectable({ providedIn: 'root' })
export class FeeReceiptService {

  constructor(private schoolContext: SchoolContextService) {}

  printReceipt(payment: FeePayment): void {
    const receiptWindow = window.open('', '_blank', 'width=760,height=900');
    if (!receiptWindow) {
      return;
    }

    receiptWindow.document.write(this.buildReceiptHtml(payment));
    receiptWindow.document.close();
    receiptWindow.focus();
    receiptWindow.print();
  }

  buildReceiptHtml(payment: FeePayment): string {
    const receiptDate = payment.paymentDate ? new Date(`${payment.paymentDate}T00:00:00`) : null;
    const printableDate = receiptDate && !Number.isNaN(receiptDate.getTime())
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(receiptDate)
      : (payment.paymentDate || 'N/A');
    const issuedAt = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date());
    const receiptNumber = `FP-${String(payment.id ?? 0).padStart(5, '0')}`;
    const schoolName = this.schoolContext.selectedSchool?.name || 'Tsoinyane School';
    const notes = payment.notes || 'No additional notes recorded.';
    const paymentMethod = payment.paymentMethod?.replace('_', ' ') || 'N/A';
    const referenceNumber = payment.referenceNumber || 'N/A';
    const termLabel = String(payment.term ?? '').replace('_', ' ');
    const fmt = (v: number | null | undefined) => `M${Number(v ?? 0).toFixed(2)}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Fee Payment Receipt</title>
  <style>
    :root { --navy: #001f5b; --navy-soft: #edf3ff; --text: #1f2f52; --muted: #5f6e8f; --border: #dbe5f5; --success: #1f8a49; }
    body { font-family: Arial, sans-serif; padding: 28px; color: var(--text); background: #f6f9ff; }
    .receipt { border: 1px solid var(--border); border-radius: 18px; max-width: 720px; margin: 0 auto; background: #fff; overflow: hidden; box-shadow: 0 18px 40px rgba(15,34,68,0.12); }
    .header { background: linear-gradient(135deg, var(--navy) 0%, #123b88 100%); color: #fff; padding: 28px; display: flex; justify-content: space-between; gap: 24px; }
    .brand h1 { margin: 0; font-size: 28px; }
    .brand p { margin: 8px 0 0; color: rgba(255,255,255,0.82); line-height: 1.5; }
    .school-name { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.82; margin-bottom: 8px; }
    .receipt-meta { min-width: 220px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; padding: 16px 18px; }
    .receipt-meta .meta-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.76; margin-bottom: 4px; }
    .receipt-meta .meta-value { display: block; font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .body { padding: 24px 28px 28px; }
    .section { margin-bottom: 22px; }
    .section-title { margin: 0 0 12px; color: var(--navy); font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; }
    .hero { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-bottom: 22px; }
    .amount-card, .balance-card { border: 1px solid var(--border); border-radius: 16px; padding: 18px; background: #fff; }
    .amount-card { background: linear-gradient(180deg, #ffffff 0%, var(--navy-soft) 100%); }
    .amount-card span, .balance-card span { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
    .amount-card strong { display: block; color: var(--navy); font-size: 36px; line-height: 1.1; }
    .balance-row { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    .balance-row:last-child { border-bottom: 0; padding-bottom: 0; }
    .balance-row.balance-due strong { color: var(--success); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 18px; }
    .item { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #fff; }
    .item span { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
    .item strong { font-size: 16px; }
    .notes { border: 1px solid var(--border); border-radius: 12px; padding: 14px; background: #fff; line-height: 1.6; }
    .footer { margin-top: 24px; padding-top: 18px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; gap: 16px; color: var(--muted); font-size: 12px; line-height: 1.6; }
    @media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; } }
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
          <strong>${fmt(payment.amount)}</strong>
        </div>
        <div class="balance-card">
          <div class="balance-row"><span>Total Fee</span><strong>${fmt(payment.totalFee)}</strong></div>
          <div class="balance-row"><span>Total Paid</span><strong>${fmt(payment.totalPaid)}</strong></div>
          <div class="balance-row balance-due"><span>Balance</span><strong>${fmt(payment.balance)}</strong></div>
        </div>
      </div>
      <div class="section">
        <h2 class="section-title">Learner Details</h2>
        <div class="grid">
          <div class="item"><span>Student No.</span><strong>${payment.studentNumber || 'N/A'}</strong></div>
          <div class="item"><span>Student</span><strong>${payment.studentName || 'Unknown Student'}</strong></div>
          <div class="item"><span>Grade</span><strong>${payment.gradeName || 'N/A'}</strong></div>
          <div class="item"><span>Academic Year</span><strong>${payment.academicYear || 'N/A'}</strong></div>
          <div class="item"><span>Term</span><strong>${termLabel}</strong></div>
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
