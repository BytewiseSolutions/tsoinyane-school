import { InstallmentSchedule } from './installment-schedule';
import { Term } from '../settings/term';

export interface InstallmentPlan {
  id?: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeId: number;
  gradeName: string;
  schoolId?: number;
  feeStructureId: number;
  term: Term;
  academicYear: string;
  totalAmount: number;
  installments: InstallmentSchedule[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}