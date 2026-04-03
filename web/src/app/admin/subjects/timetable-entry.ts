export interface TimetableEntry {
  id?: number;
  subjectAssignmentId?: number | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectId: number | null;
  subjectName?: string | null;
  gradeId?: number | null;
  gradeName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  studentIds?: number[];
  studentCount?: number | null;
  lessonCount?: number | null;
}
