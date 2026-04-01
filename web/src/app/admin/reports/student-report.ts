export interface SubjectReport {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  totalLessons: number;
  present: number;
  absent: number;
  late: number;
  homeworkDone: number;
  homeworkNotDone: number;
  attendanceRate: number;
  homeworkRate: number;
}

export interface StudentReport {
  studentId: number;
  studentNumber: string;
  studentName: string;
  gradeName: string;
  schoolName: string;
  totalLessons: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalHomeworkDone: number;
  totalHomeworkNotDone: number;
  attendanceRate: number;
  homeworkRate: number;
  subjects: SubjectReport[];
}
