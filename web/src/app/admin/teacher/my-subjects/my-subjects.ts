import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';

@Component({
  selector: 'app-my-subjects',
  standalone: false,
  templateUrl: './my-subjects.html',
  styleUrl: './my-subjects.scss',
})
export class MySubjects implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  statusFilter = 'ALL';

  teacherProfile: Teacher | null = null;
  mySubjects: SchoolSubject[] = [];

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadMySubjects();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  get filteredSubjects(): SchoolSubject[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.mySubjects
      .filter(subject => this.statusFilter === 'ALL' || String(subject.status ?? '') === this.statusFilter)
      .filter(subject => {
        if (!query) {
          return true;
        }

        return String(subject.name ?? '').toLowerCase().includes(query)
          || String(subject.code ?? '').toLowerCase().includes(query)
          || String(subject.gradeName ?? '').toLowerCase().includes(query);
      });
  }

  get activeSubjectCount(): number {
    return this.mySubjects.filter(subject => subject.status === 'ACTIVE').length;
  }

  get gradeCount(): number {
    return new Set(
      this.mySubjects
        .map(subject => subject.gradeId)
        .filter((gradeId): gradeId is number => gradeId != null)
    ).size;
  }

  get totalLearners(): number {
    return this.mySubjects.reduce((sum, subject) => sum + Number(subject.studentCount ?? 0), 0);
  }

  getStatusLabel(status: string | null | undefined): string {
    return String(status ?? 'UNKNOWN').replace(/_/g, ' ');
  }

  getStatusClass(status: string | null | undefined): string {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'INACTIVE':
      case 'DELETED':
        return 'inactive';
      case 'PENDING':
        return 'pending';
      default:
        return 'neutral';
    }
  }

  viewSubject(subject: SchoolSubject): void {
    if (!subject.assignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-subjects', subject.assignmentId]);
  }

  private loadMySubjects(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.mySubjects = [];
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
          this.mySubjects = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          return;
        }

        this.teacherProfile = teacher;
        this.mySubjects = (assignments ?? [])
          .map(assignment => ({
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
          }))
          .filter(subject => subject.teacherId === teacher.id);
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.mySubjects = [];
        this.errorMessage = error.error?.message || 'Failed to load your subjects.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
