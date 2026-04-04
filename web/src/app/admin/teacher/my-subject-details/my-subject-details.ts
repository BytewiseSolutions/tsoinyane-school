import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { TimetableEntry } from '../../subjects/timetable-entry';
import { Lesson } from '../../subjects/lesson';
import { StudentReport } from '../../reports/student-report';

interface SubjectStudentSummary {
  id: number;
  userId: number | null;
  displayName: string;
  studentNumber: string | null;
  gradeName: string | null;
  email: string | null;
  phone: string | null;
}

interface SubjectStudentPerformance {
  studentId: number;
  userId: number | null;
  displayName: string;
  studentNumber: string | null;
  attendanceRate: number;
  homeworkRate: number;
  totalLessons: number;
  present: number;
  absent: number;
  late: number;
}

@Component({
  selector: 'app-my-subject-details',
  standalone: false,
  templateUrl: './my-subject-details.html',
  styleUrl: './my-subject-details.scss',
})
export class MySubjectDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  assignmentId: number | null = null;
  isLoading = false;
  errorMessage = '';
  activeTab: 'overview' | 'students' | 'performance' = 'overview';
  teacherProfile: Teacher | null = null;
  subjectAssignment: SchoolSubject | null = null;
  assignedStudents: SubjectStudentSummary[] = [];
  timetables: TimetableEntry[] = [];
  lessons: Lesson[] = [];
  studentPerformance: SubjectStudentPerformance[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;
    this.assignmentId = Number(this.route.snapshot.paramMap.get('assignmentId'));

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadSubjectDetails();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get subjectTitle(): string {
    return this.subjectAssignment?.name?.trim() || 'Subject Details';
  }

  get gradeLabel(): string {
    return this.subjectAssignment?.gradeName?.trim() || 'N/A';
  }

  get codeLabel(): string {
    return this.subjectAssignment?.code?.trim() || 'N/A';
  }

  get learnerCount(): number {
    return Number(this.subjectAssignment?.studentCount ?? this.assignedStudents.length ?? 0);
  }

  get statusLabel(): string {
    return this.formatStatus(this.subjectAssignment?.status ?? null);
  }

  get hasAssignedStudents(): boolean {
    return this.assignedStudents.length > 0;
  }

  get timetableSlotCount(): number {
    return this.timetables.length;
  }

  get lessonCount(): number {
    return this.lessons.length;
  }

  get averageAttendanceRate(): number {
    if (!this.studentPerformance.length) {
      return 0;
    }

    const total = this.studentPerformance.reduce((sum, student) => sum + student.attendanceRate, 0);
    return Math.round(total / this.studentPerformance.length);
  }

  get averageHomeworkRate(): number {
    if (!this.studentPerformance.length) {
      return 0;
    }

    const total = this.studentPerformance.reduce((sum, student) => sum + student.homeworkRate, 0);
    return Math.round(total / this.studentPerformance.length);
  }

  get hasStudentPerformance(): boolean {
    return this.studentPerformance.length > 0;
  }

  setActiveTab(tab: 'overview' | 'students' | 'performance'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/admin/my-subjects']);
  }

  openTimetable(): void {
    if (!this.subjectAssignment?.assignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-timetable'], {
      queryParams: { assignmentId: this.subjectAssignment.assignmentId },
    });
  }

  openLessons(): void {
    if (!this.subjectAssignment?.assignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-lessons'], {
      queryParams: { assignmentId: this.subjectAssignment.assignmentId },
    });
  }

  openReports(): void {
    this.router.navigate(['/admin/reports']);
  }

  openNotifications(): void {
    this.router.navigate(['/admin/notifications']);
  }

  viewStudent(student: SubjectStudentSummary): void {
    if (!student.id) {
      return;
    }

    this.router.navigate(['/admin/my-students', student.id]);
  }

  openStudentReport(student: SubjectStudentSummary): void {
    if (!student.userId) {
      return;
    }

    this.router.navigate(['/admin/reports'], {
      queryParams: {
        studentUserId: student.userId,
      },
    });
  }

  private loadSubjectDetails(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.subjectAssignment = null;
      this.assignedStudents = [];
      this.timetables = [];
      this.lessons = [];
      this.studentPerformance = [];
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
      return;
    }

    if (!Number.isFinite(this.assignmentId) || Number(this.assignmentId) <= 0) {
      this.subjectAssignment = null;
      this.assignedStudents = [];
      this.timetables = [];
      this.lessons = [];
      this.studentPerformance = [];
      this.errorMessage = 'Subject assignment was not found.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }),
      assignments: this.backendService.get<any[]>('subject-assignment', { schoolId: this.selectedSchoolId }),
      students: this.backendService.get<any[]>(`subject-assignment/${this.assignmentId}/students`),
    }).subscribe({
      next: ({ teachers, assignments, students }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId) ?? null;

        if (!teacher?.id) {
          this.teacherProfile = null;
          this.subjectAssignment = null;
          this.assignedStudents = [];
          this.timetables = [];
          this.lessons = [];
          this.studentPerformance = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          return;
        }

        this.teacherProfile = teacher;

        const subjectAssignment = (assignments ?? [])
          .map(assignment => this.mapAssignment(assignment))
          .find(subject =>
            subject.assignmentId === this.assignmentId
            && subject.teacherId === teacher.id
          ) ?? null;

        if (!subjectAssignment) {
          this.subjectAssignment = null;
          this.assignedStudents = [];
          this.timetables = [];
          this.lessons = [];
          this.studentPerformance = [];
          this.errorMessage = 'This subject is not assigned to you in the selected school.';
          return;
        }

        this.subjectAssignment = subjectAssignment;
        this.assignedStudents = (students ?? []).map(student => ({
          id: Number(student.id ?? 0),
          userId: student.userId != null ? Number(student.userId) : null,
          displayName: student.userFullName || student.userEmail || 'Unknown Student',
          studentNumber: student.studentNumber ?? null,
          gradeName: student.gradeName ?? null,
          email: student.userEmail ?? null,
          phone: student.userPhone ?? null,
        }));

        const timetable$ = this.backendService.get<TimetableEntry[]>('timetable', { subjectId: subjectAssignment.subjectId ?? subjectAssignment.id! });
        const reportRequests = this.assignedStudents
          .filter(student => student.userId != null)
          .map(student => this.backendService.get<StudentReport>(`report/student/${student.userId}`));

        forkJoin({
          timetables: timetable$,
          reports: reportRequests.length ? forkJoin(reportRequests) : of([] as StudentReport[]),
        }).subscribe({
          next: ({ timetables, reports }) => {
            this.timetables = (timetables ?? []).filter(entry =>
              Number(entry.subjectAssignmentId ?? 0) === Number(subjectAssignment.assignmentId ?? 0)
            );

            const lessonRequests = this.timetables
              .filter(entry => entry.id != null)
              .map(entry => this.backendService.get<Lesson[]>('lesson', { timetableId: entry.id! }));

            const lessons$ = lessonRequests.length
              ? forkJoin(lessonRequests)
              : of([] as Lesson[][]);

            lessons$.subscribe({
              next: lessonGroups => {
                this.lessons = lessonGroups.flat();
                const subjectId = Number(subjectAssignment.subjectId ?? subjectAssignment.id ?? 0);

                this.studentPerformance = reports
                  .map(report => {
                    const subjectReport = (report.subjects ?? []).find(subject => Number(subject.subjectId) === subjectId);
                    if (!subjectReport) {
                      return null;
                    }

                    const student = this.assignedStudents.find(item => Number(item.userId ?? 0) === Number(report.studentId));

                    return {
                      studentId: student?.id ?? 0,
                      userId: student?.userId ?? null,
                      displayName: student?.displayName || report.studentName,
                      studentNumber: student?.studentNumber || report.studentNumber,
                      attendanceRate: subjectReport.attendanceRate,
                      homeworkRate: subjectReport.homeworkRate,
                      totalLessons: subjectReport.totalLessons,
                      present: subjectReport.present,
                      absent: subjectReport.absent,
                      late: subjectReport.late,
                    };
                  })
                  .filter((row): row is SubjectStudentPerformance => !!row)
                  .sort((left, right) =>
                    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
                  );
              },
              error: () => {
                this.lessons = [];
                this.studentPerformance = [];
              },
            });
          },
          error: () => {
            this.timetables = [];
            this.lessons = [];
            this.studentPerformance = [];
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.subjectAssignment = null;
        this.assignedStudents = [];
        this.timetables = [];
        this.lessons = [];
        this.studentPerformance = [];
        this.errorMessage = error.error?.message || 'Failed to load subject details.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private mapAssignment(assignment: any): SchoolSubject {
    return {
      id: Number(assignment.subjectId ?? 0),
      subjectId: Number(assignment.subjectId ?? 0),
      assignmentId: Number(assignment.id ?? 0),
      code: assignment.subjectCode ?? '',
      name: assignment.subjectName ?? '',
      schoolId: assignment.schoolId ?? this.selectedSchoolId,
      schoolName: assignment.schoolName ?? this.selectedSchoolName,
      gradeId: assignment.gradeId ?? null,
      gradeName: assignment.gradeName ?? null,
      teacherId: assignment.teacherId ?? null,
      teacherName: assignment.teacherName ?? null,
      studentCount: assignment.studentCount ?? 0,
      assignmentCount: null,
      status: assignment.status ?? null,
    };
  }

  private formatStatus(status: string | null | undefined): string {
    return String(status ?? 'UNKNOWN').replace(/_/g, ' ');
  }
}
