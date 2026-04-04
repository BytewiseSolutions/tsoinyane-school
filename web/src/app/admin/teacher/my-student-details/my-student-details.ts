import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { StudentReport, SubjectReport } from '../../reports/student-report';

interface StudentSubjectLink {
  assignmentId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  gradeName: string | null;
  teacherName: string | null;
}

interface TeacherStudentDetail {
  studentId: number;
  userId: number | null;
  displayName: string;
  studentNumber: string | null;
  gradeName: string | null;
  email: string | null;
  phone: string | null;
}

@Component({
  selector: 'app-my-student-details',
  standalone: false,
  templateUrl: './my-student-details.html',
  styleUrl: './my-student-details.scss',
})
export class MyStudentDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  studentId: number | null = null;
  activeTab: 'overview' | 'subjects' | 'report' = 'overview';
  isLoading = false;
  errorMessage = '';

  teacherProfile: Teacher | null = null;
  student: TeacherStudentDetail | null = null;
  teacherSubjects: SchoolSubject[] = [];
  linkedSubjects: StudentSubjectLink[] = [];
  report: StudentReport | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;
    this.studentId = Number(this.route.snapshot.paramMap.get('studentId'));

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadStudentDetails();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get title(): string {
    return this.student?.displayName || 'Student Details';
  }

  get filteredReportSubjects(): SubjectReport[] {
    const teacherSubjectIds = new Set(
      this.linkedSubjects.map(subject => Number(subject.subjectId))
    );

    return (this.report?.subjects ?? []).filter(subject => teacherSubjectIds.has(Number(subject.subjectId)));
  }

  setActiveTab(tab: 'overview' | 'subjects' | 'report'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/admin/my-students']);
  }

  openReport(): void {
    if (!this.student?.userId) {
      return;
    }

    this.router.navigate(['/admin/reports'], {
      queryParams: {
        studentUserId: this.student.userId,
      },
    });
  }

  openSubject(subject: StudentSubjectLink): void {
    this.router.navigate(['/admin/my-subjects', subject.assignmentId]);
  }

  private loadStudentDetails(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.student = null;
      this.linkedSubjects = [];
      this.report = null;
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
      return;
    }

    if (!Number.isFinite(this.studentId) || Number(this.studentId) <= 0) {
      this.errorMessage = 'Student was not found.';
      this.student = null;
      this.linkedSubjects = [];
      this.report = null;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }),
      assignments: this.backendService.get<any[]>('subject-assignment', { schoolId: this.selectedSchoolId }),
    }).subscribe({
      next: ({ teachers, assignments }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId) ?? null;

        if (!teacher?.id) {
          this.teacherProfile = null;
          this.student = null;
          this.linkedSubjects = [];
          this.report = null;
          this.errorMessage = 'No teacher profile was found for the selected school.';
          this.isLoading = false;
          return;
        }

        this.teacherProfile = teacher;
        this.teacherSubjects = (assignments ?? [])
          .map(assignment => this.mapAssignment(assignment))
          .filter(subject => subject.teacherId === teacher.id);

        const studentRequests = this.teacherSubjects
          .filter(subject => subject.assignmentId != null)
          .map(subject => this.backendService.get<any[]>(`subject-assignment/${subject.assignmentId}/students`));

        const students$ = studentRequests.length
          ? forkJoin(studentRequests)
          : of([] as any[][]);

        students$.subscribe({
          next: studentGroups => {
            const matchingSubjects: StudentSubjectLink[] = [];
            let matchingStudent: TeacherStudentDetail | null = null;

            studentGroups.forEach((group, index) => {
              const subject = this.teacherSubjects[index];
              const matched = (group ?? []).find(student => Number(student.id ?? 0) === Number(this.studentId));

              if (!matched) {
                return;
              }

              matchingStudent = {
                studentId: Number(matched.id ?? 0),
                userId: matched.userId != null ? Number(matched.userId) : null,
                displayName: matched.userFullName || matched.userEmail || 'Unknown Student',
                studentNumber: matched.studentNumber ?? null,
                gradeName: matched.gradeName ?? null,
                email: matched.userEmail ?? null,
                phone: matched.userPhone ?? null,
              };

              matchingSubjects.push({
                assignmentId: Number(subject.assignmentId ?? 0),
                subjectId: Number(subject.subjectId ?? 0),
                subjectName: subject.name || 'Unknown Subject',
                subjectCode: subject.code || '',
                gradeName: subject.gradeName ?? null,
                teacherName: subject.teacherName ?? null,
              });
            });

            if (!matchingStudent) {
              this.student = null;
              this.linkedSubjects = [];
              this.report = null;
              this.errorMessage = 'This student is not linked to any of your subject assignments.';
              this.isLoading = false;
              return;
            }

            this.student = matchingStudent;
            this.linkedSubjects = matchingSubjects.sort((left, right) =>
              left.subjectName.localeCompare(right.subjectName, undefined, { sensitivity: 'base' })
            );

            const selectedStudent = matchingStudent as TeacherStudentDetail;
            const report$ = selectedStudent.userId
              ? this.backendService.get<StudentReport>(`report/student/${selectedStudent.userId}`)
              : of<StudentReport | null>(null);

            report$.subscribe({
              next: report => {
                this.report = report;
              },
              error: (error: HttpErrorResponse) => {
                this.report = null;
                this.errorMessage = error.error?.message || 'Failed to load this learner report.';
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: (error: HttpErrorResponse) => {
            this.student = null;
            this.linkedSubjects = [];
            this.report = null;
            this.errorMessage = error.error?.message || 'Failed to load this learner.';
            this.isLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.student = null;
        this.linkedSubjects = [];
        this.report = null;
        this.errorMessage = error.error?.message || 'Failed to load this learner.';
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
}
