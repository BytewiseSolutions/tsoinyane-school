import { Term } from '../settings/term';
import { FeeType } from './fee-type';

export interface FeeStructure {
  id?: number;
  createdAt?: string | null;
  schoolId: number | null;
  schoolName?: string | null;
  gradeId: number | null;
  gradeName?: string | null;
  term: Term | null;
  academicYear: string;
  feeType?: FeeType | null;
  amount?: number | null;
  registrationFee: number | null;
  schoolFee: number | null;
  examFee: number | null;
  termOpeningDate?: string | null;
  termClosingDate?: string | null;
  updateTermDates?: boolean | null;
  totalAmount?: number | null;
}
