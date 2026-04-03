import { PaymentMethod } from './payment-method';

export interface FeePayment {
  id?: number;
  createdAt?: string | null;
  schoolId?: number | null;
  studentId: number | null;
  studentName?: string | null;
  studentNumber?: string | null;
  feeStructureId: number | null;
  gradeId?: number | null;
  gradeName?: string | null;
  term?: string | null;
  academicYear?: string | null;
  amount: number | null;
  paymentDate: string;
  paymentMethod: PaymentMethod | null;
  referenceNumber?: string | null;
  notes?: string | null;
  totalFee?: number | null;
  totalPaid?: number | null;
  balance?: number | null;
  reversed?: boolean;
  reversedAt?: string | null;
  reversalReason?: string | null;
}
