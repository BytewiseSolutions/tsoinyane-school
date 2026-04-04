import { AssessmentStatus } from './assessment-status';
import { AssessmentType } from './assessment-type';

export interface Assessment {
  id?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  schoolId?: number | null;
  schoolName?: string | null;
  subjectAssignmentId?: number | null;
  subjectId?: number | null;
  subjectCode?: string | null;
  subjectName?: string | null;
  gradeId?: number | null;
  gradeName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  title?: string | null;
  description?: string | null;
  type?: AssessmentType | null;
  status?: AssessmentStatus | null;
  assessmentDate?: string | null;
  totalMarks?: number | null;
  passMark?: number | null;
  studentCount?: number | null;
  markedCount?: number | null;
  averageScore?: number | null;
  averagePercentage?: number | null;
}
