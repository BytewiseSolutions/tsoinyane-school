export interface Teacher {
  id?: number;
  userId?: number | null;
  userFullName?: string | null;
  userEmail?: string | null;
  schoolId?: number | null;
  schoolName?: string | null;
  gradeIds?: number[];
  gradeNames?: string[];
}
