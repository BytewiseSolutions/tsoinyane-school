import { LessonStatus } from './lesson-status';

export interface Lesson {
  id?: number;
  cancellationReason?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: LessonStatus | null;
  submitted?: boolean | null;
  subjectId?: number | null;
  subjectName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  timetableId?: number | null;
}
