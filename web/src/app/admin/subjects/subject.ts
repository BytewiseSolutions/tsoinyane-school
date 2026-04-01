import { Status } from '../users/status';

export interface SchoolSubject {
  id?: number;
  code: string;
  name: string;
  schoolId: number | null;
  schoolName?: string | null;
  gradeId: number | null;
  gradeName?: string | null;
  teacherId: number | null;
  teacherName?: string | null;
  status: Status | null;
}
