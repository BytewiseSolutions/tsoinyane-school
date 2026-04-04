import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { StudentReport } from './student-report';
import { getStoredUser, hasRole } from '../../auth/auth-session';

interface GradeOption { id: number; name: string; }
interface StudentOption { id: number; name: string; studentNumber: string; gradeId: number; }

@Component({
  selector: 'app-reports',
  standalone: false,
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  isTeacherView = false;
  grades: GradeOption[] = [];
  students: StudentOption[] = [];
  allowedStudentUserIds = new Set<number>();
  allowedTeacherSubjectIds = new Set<number>();
  teacherStudentGradeMap = new Map<number, GradeOption>();
  selectedGradeId: number | null = null;
  selectedStudentId: number | null = null;
  pendingStudentId: number | null = null;
  pendingGradeId: number | null = null;

  report: StudentReport | null = null;
  loading = false;
  error = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isTeacherView = hasRole('TEACHER') && !hasRole('SYSTEM_ADMIN') && !hasRole('SCHOOL_ADMIN');

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const studentUserId = Number(params.get('studentUserId'));
        const gradeId = Number(params.get('gradeId'));
        this.pendingStudentId = Number.isFinite(studentUserId) && studentUserId > 0 ? studentUserId : null;
        this.pendingGradeId = Number.isFinite(gradeId) && gradeId > 0 ? gradeId : null;
        this.applyPendingSelection();
      });

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.reset();
        if (this.selectedSchoolId) {
          if (this.isTeacherView) {
            this.loadTeacherContext();
          } else {
            this.loadGrades();
            this.loadStudents();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredStudents(): StudentOption[] {
    if (!this.selectedGradeId) return this.students;
    return this.students.filter(s => s.gradeId === this.selectedGradeId);
  }

  onGradeChange(): void {
    this.selectedStudentId = null;
    this.report = null;
    this.error = '';
  }

  onStudentChange(): void {
    this.report = null;
    this.error = '';
    if (this.selectedStudentId) this.loadReport();
  }

  getRateClass(rate: number): string {
    if (rate >= 80) return 'rate-good';
    if (rate >= 60) return 'rate-average';
    return 'rate-poor';
  }

  private loadReport(): void {
    if (!this.selectedStudentId) return;
    this.loading = true;
    this.error = '';

    this.backendService.get<StudentReport>(`report/student/${this.selectedStudentId}`).subscribe({
      next: (report) => {
        this.report = this.isTeacherView
          ? {
              ...report,
              subjects: (report.subjects ?? []).filter(subject => this.allowedTeacherSubjectIds.has(Number(subject.subjectId))),
            }
          : report;
      },
      error: (e: HttpErrorResponse) => { this.error = e.error?.message || 'Failed to load report.'; },
      complete: () => { this.loading = false; },
    });
  }

  private loadGrades(): void {
    if (!this.selectedSchoolId) return;
    this.backendService.get<any[]>('grade', { schoolId: this.selectedSchoolId }).subscribe({
      next: (grades) => { this.grades = (grades ?? []).map(g => ({ id: g.id, name: g.name })); },
    });
  }

  private loadStudents(): void {
    if (!this.selectedSchoolId) return;
    this.backendService.get<any[]>('student', { schoolId: this.selectedSchoolId }).subscribe({
      next: (students) => {
        this.students = (students ?? [])
          .filter(student => !this.isTeacherView || this.allowedStudentUserIds.has(Number(student.userId ?? 0)))
          .map(student => {
            const userId = Number(student.userId ?? 0);
            const assignedGrade = this.teacherStudentGradeMap.get(userId);

            return {
              id: userId,
              name: student.userFullName || student.userEmail || 'Unknown Student',
              studentNumber: student.studentNumber ?? '',
              gradeId: assignedGrade?.id ?? Number(student.gradeId ?? 0),
            };
          })
          .filter(student => student.id > 0);
        if (this.isTeacherView) {
          this.grades = [...new Map(
            [...this.teacherStudentGradeMap.values()].map(grade => [grade.id, grade])
          ).values()].sort((left, right) =>
            left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
          );
        }
        this.applyPendingSelection();
      },
    });
  }

  private loadTeacherContext(): void {
    const schoolId = this.selectedSchoolId;

    if (!schoolId) {
      return;
    }

    const currentUser = getStoredUser();

    this.backendService.get<any[]>('teacher', { schoolId }).subscribe({
      next: teachers => {
        const teacher = (teachers ?? []).find(item => item.userId === currentUser?.id);

        if (!teacher?.id) {
          this.allowedStudentUserIds = new Set<number>();
          this.allowedTeacherSubjectIds = new Set<number>();
          this.teacherStudentGradeMap = new Map<number, GradeOption>();
          this.grades = [];
          this.students = [];
          this.error = 'No teacher profile was found for the selected school.';
          return;
        }

        this.backendService.get<any[]>('subject-assignment', { schoolId }).subscribe({
          next: assignments => {
            const teacherAssignments = (assignments ?? []).filter(assignment => assignment.teacherId === teacher.id);
            this.allowedTeacherSubjectIds = new Set(
              teacherAssignments
                .map(assignment => Number(assignment.subjectId ?? 0))
                .filter(subjectId => subjectId > 0)
            );

            const assignmentRequests = teacherAssignments
              .filter(assignment => assignment.id != null)
              .map(assignment => this.backendService.get<any[]>(`subject-assignment/${assignment.id}/students`));

            if (!assignmentRequests.length) {
              this.allowedStudentUserIds = new Set<number>();
              this.teacherStudentGradeMap = new Map<number, GradeOption>();
              this.grades = [];
              this.loadStudents();
              return;
            }

            forkJoin(assignmentRequests).subscribe({
              next: studentGroups => {
                const teacherStudents = studentGroups.flat();
                const teacherGradeMap = new Map<number, GradeOption>();
                const teacherStudentGradeMap = new Map<number, GradeOption>();

                this.allowedStudentUserIds = new Set(
                  teacherStudents
                    .map(student => Number(student.userId ?? 0))
                    .filter(userId => userId > 0)
                );

                teacherAssignments.forEach((assignment, index) => {
                  const gradeId = Number(assignment.gradeId ?? 0);
                  const gradeName = String(assignment.gradeName ?? '').trim();

                  if (gradeId > 0) {
                    teacherGradeMap.set(gradeId, {
                      id: gradeId,
                      name: gradeName || `Grade ${gradeId}`,
                    });
                  }

                  (studentGroups[index] ?? []).forEach(student => {
                    const userId = Number(student.userId ?? 0);
                    if (userId > 0 && gradeId > 0 && !teacherStudentGradeMap.has(userId)) {
                      teacherStudentGradeMap.set(userId, {
                        id: gradeId,
                        name: gradeName || `Grade ${gradeId}`,
                      });
                    }
                  });
                });

                this.teacherStudentGradeMap = teacherStudentGradeMap;
                this.grades = [...teacherGradeMap.values()].sort((left, right) =>
                  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
                );
                this.loadStudents();
              },
              error: () => {
                this.allowedStudentUserIds = new Set<number>();
                this.allowedTeacherSubjectIds = new Set<number>();
                this.teacherStudentGradeMap = new Map<number, GradeOption>();
                this.grades = [];
                this.error = 'Failed to load your learner reports.';
              },
            });
          },
          error: () => {
            this.error = 'Failed to load your subject assignments.';
          },
        });
      },
    });
  }

  private applyPendingSelection(): void {
    if (this.pendingGradeId && this.grades.some(grade => grade.id === this.pendingGradeId)) {
      this.selectedGradeId = this.pendingGradeId;
      this.pendingGradeId = null;
    }

    if (this.pendingStudentId && this.students.some(student => student.id === this.pendingStudentId)) {
      this.selectedStudentId = this.pendingStudentId;
      this.pendingStudentId = null;
      this.loadReport();
    }
  }

  private reset(): void {
    this.grades = [];
    this.students = [];
    this.allowedStudentUserIds = new Set<number>();
    this.allowedTeacherSubjectIds = new Set<number>();
    this.teacherStudentGradeMap = new Map<number, GradeOption>();
    this.selectedGradeId = null;
    this.selectedStudentId = null;
    this.report = null;
    this.error = '';
  }
}
