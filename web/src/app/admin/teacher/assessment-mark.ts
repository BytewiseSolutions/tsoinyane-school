export interface AssessmentMark {
  id?: number | null;
  assessmentId?: number | null;
  studentId?: number | null;
  studentName?: string | null;
  studentNumber?: string | null;
  gradeId?: number | null;
  gradeName?: string | null;
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  totalMarks?: number | null;
  passMark?: number | null;
  comment?: string | null;
}
