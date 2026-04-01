export interface TimetableEntry {
  id?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectId: number | null;
  subjectName?: string | null;
  studentIds?: number[];
}
