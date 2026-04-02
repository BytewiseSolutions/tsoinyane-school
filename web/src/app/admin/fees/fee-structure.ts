import { Term } from '../settings/term';

export interface FeeStructure {
  id?: number;
  createdAt?: string | null;
  schoolId: number | null;
  schoolName?: string | null;
  gradeId: number | null;
  gradeName?: string | null;
  term: Term | null;
  academicYear: string;
  registrationFee: number | null;
  schoolFee: number | null;
  examFee: number | null;
  description?: string | null;
  totalAmount?: number | null;
}
