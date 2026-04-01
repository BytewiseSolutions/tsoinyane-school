import { AbsenceReason } from './absence-reason';
import { AttendanceStatus } from './attendance-status';
import { HomeworkStatus } from './homework-status';

export interface StudentLesson {
  id?: number;
  lessonId: number | null;
  studentId: number | null;
  studentName?: string | null;
  studentNumber?: string | null;
  attendanceStatus?: AttendanceStatus | null;
  homeworkStatus?: HomeworkStatus | null;
  absenceReason?: AbsenceReason | null;
  comment?: string | null;
  absenceComment?: string | null;
}
