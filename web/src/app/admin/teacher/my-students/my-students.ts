import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';

interface TeacherStudentRow {
  studentId: number;
  userId: number | null;
  studentNumber: string | null;
  displayName: string;
  gradeId: number | null;
  gradeName: string | null;
  email: string | null;
  phone: string | null;
  subjectNames: string[];
  subjectAssignmentIds: number[];
}

@Component({
  selector: 'app-my-students',
  standalone: false,
  templateUrl: './my-students.html',
  styleUrl: './my-students.scss',
})
export class MyStudents implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly sortOptions = ['name-asc', 'name-desc', 'student-number-asc', 'grade-asc'];

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  selectedSubjectAssignmentFilter: number | 'ALL' = 'ALL';
  selectedGradeFilter: number | 'ALL' = 'ALL';
  selectedSort = 'name-asc';

  teacherProfile: Teacher | null = null;
  teacherSubjects: SchoolSubject[] = [];
  students: TeacherStudentRow[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadMyStudents();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredStudents(): TeacherStudentRow[] {
    const query = this.searchTerm.trim().toLowerCase();

    return [...this.students]
      .filter(student =>
        this.selectedSubjectAssignmentFilter === 'ALL'
          || student.subjectAssignmentIds.includes(Number(this.selectedSubjectAssignmentFilter))
      )
      .filter(student =>
        this.selectedGradeFilter === 'ALL'
          || Number(student.gradeId ?? 0) === Number(this.selectedGradeFilter)
      )
      .filter(student => {
        if (!query) {
          return true;
        }

        return student.displayName.toLowerCase().includes(query)
          || String(student.studentNumber ?? '').toLowerCase().includes(query)
          || String(student.gradeName ?? '').toLowerCase().includes(query)
          || student.subjectNames.some(subjectName => subjectName.toLowerCase().includes(query));
      })
      .sort((left, right) => this.compareStudents(left, right));
  }

  get totalStudents(): number {
    return this.students.length;
  }

  get totalGrades(): number {
    return new Set(
      this.students
        .map(student => Number(student.gradeId ?? 0))
        .filter(gradeId => gradeId > 0)
    ).size;
  }

  get totalAssignments(): number {
    return this.teacherSubjects.length;
  }

  get filteredStudentCount(): number {
    return this.filteredStudents.length;
  }

  get subjectFilterOptions(): SchoolSubject[] {
    return [...this.teacherSubjects].sort((left, right) =>
      (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
      || (left.gradeName ?? '').localeCompare(right.gradeName ?? '', undefined, { sensitivity: 'base' })
    );
  }

  get gradeFilterOptions(): Array<{ id: number; name: string }> {
    const grades = new Map<number, string>();

    this.students.forEach(student => {
      const gradeId = Number(student.gradeId ?? 0);
      if (gradeId > 0 && !grades.has(gradeId)) {
        grades.set(gradeId, student.gradeName || `Grade ${gradeId}`);
      }
    });

    return [...grades.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
  }

  getSubjectsLabel(student: TeacherStudentRow): string {
    return student.subjectNames.length ? student.subjectNames.join(', ') : 'No linked subjects';
  }

  viewStudent(student: TeacherStudentRow): void {
    if (!student.studentId) {
      return;
    }

    this.router.navigate(['/admin/my-students', student.studentId]);
  }

  openReport(student: TeacherStudentRow): void {
    if (!student.userId) {
      return;
    }

    this.router.navigate(['/admin/reports'], {
      queryParams: {
        studentUserId: student.userId,
        gradeId: student.gradeId ?? undefined,
      },
    });
  }

  private loadMyStudents(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.teacherSubjects = [];
      this.students = [];
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
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
          this.teacherSubjects = [];
          this.students = [];
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
            const studentMap = new Map<number, TeacherStudentRow>();

            studentGroups.forEach((group, index) => {
              const subject = this.teacherSubjects[index];

              (group ?? []).forEach(student => {
                const studentId = Number(student.id ?? 0);
                if (!studentId) {
                  return;
                }

                const existing = studentMap.get(studentId);
                const subjectLabel = [subject.name, subject.gradeName].filter(Boolean).join(' • ') || subject.name || 'Subject';

                if (existing) {
                  if (!existing.subjectAssignmentIds.includes(Number(subject.assignmentId ?? 0))) {
                    existing.subjectAssignmentIds.push(Number(subject.assignmentId ?? 0));
                  }
                  if (!existing.subjectNames.includes(subjectLabel)) {
                    existing.subjectNames.push(subjectLabel);
                  }
                  return;
                }

                studentMap.set(studentId, {
                  studentId,
                  userId: student.userId != null ? Number(student.userId) : null,
                  studentNumber: student.studentNumber ?? null,
                  displayName: student.userFullName || student.userEmail || 'Unknown Student',
                  gradeId: student.gradeId != null ? Number(student.gradeId) : null,
                  gradeName: student.gradeName ?? null,
                  email: student.userEmail ?? null,
                  phone: student.userPhone ?? null,
                  subjectNames: [subjectLabel],
                  subjectAssignmentIds: subject.assignmentId != null ? [Number(subject.assignmentId)] : [],
                });
              });
            });

            this.students = [...studentMap.values()].sort((left, right) =>
              left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' })
            );
          },
          error: (error: HttpErrorResponse) => {
            this.students = [];
            this.errorMessage = error.error?.message || 'Failed to load your students.';
          },
          complete: () => {
            this.isLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.teacherSubjects = [];
        this.students = [];
        this.errorMessage = error.error?.message || 'Failed to load your students.';
        this.isLoading = false;
      },
    });
  }

  private compareStudents(left: TeacherStudentRow, right: TeacherStudentRow): number {
    switch (this.selectedSort) {
      case 'name-desc':
        return right.displayName.localeCompare(left.displayName, undefined, { sensitivity: 'base' });
      case 'student-number-asc':
        return String(left.studentNumber ?? '').localeCompare(String(right.studentNumber ?? ''), undefined, { sensitivity: 'base' });
      case 'grade-asc':
        return String(left.gradeName ?? '').localeCompare(String(right.gradeName ?? ''), undefined, { sensitivity: 'base' })
          || left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' });
      case 'name-asc':
      default:
        return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' });
    }
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
