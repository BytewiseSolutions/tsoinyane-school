import { InstallmentSchedule } from './installment-schedule';

export interface InstallmentPlan {
  id?: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeId: number;
  gradeName: string;
  feeStructureId: number;
  term: string;
  academicYear: string;
  totalAmount: number;
  installments: InstallmentSchedule[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}