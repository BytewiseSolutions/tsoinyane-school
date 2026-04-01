import { Term } from './term';

export interface AcademicSettings {
  academicYear: string;
  currentTerm: Term | null;
  passingMark: number | null;
  attendanceThreshold: number | null;
  language: string;
}
