import { PaymentMethod } from './payment-method';

export interface ReversedPaymentReport {
  paymentId: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeId: number | null;
  gradeName: string | null;
  term: string | null;
  academicYear: string | null;
  paymentDate: string;
  paymentMethod: PaymentMethod | null;
  amount: number;
  referenceNumber: string | null;
  reversedAt: string | null;
  reversalReason: string | null;
}
