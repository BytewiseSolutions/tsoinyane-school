import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { Assessment } from '../assessment';
import { AssessmentType } from '../assessment-type';
import { AssessmentStatus } from '../assessment-status';

@Component({
  selector: 'app-my-assessments',
  standalone: false,
  templateUrl: './my-assessments.html',
  styleUrl: './my-assessments.scss',
})
export class MyAssessments implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly AssessmentType = AssessmentType;
  readonly AssessmentStatus = AssessmentStatus;
  readonly assessmentTypes = Object.values(AssessmentType);
  readonly assessmentStatuses: Array<AssessmentStatus | 'ALL'> = ['ALL', ...Object.values(AssessmentStatus)];
  readonly formAssessmentStatuses: AssessmentStatus[] = Object.values(AssessmentStatus);

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  formError = '';
  searchTerm = '';
  selectedStatusFilter: AssessmentStatus | 'ALL' = 'ALL';
  selectedSubjectAssignmentFilter: number | 'ALL' = 'ALL';
  showForm = false;
  editingAssessmentId: number | null = null;

  teacherProfile: Teacher | null = null;
  teacherSubjects: SchoolSubject[] = [];
  assessments: Assessment[] = [];

  assessmentForm = this.createEmptyForm();

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const assignmentId = Number(params.get('assignmentId'));
        this.selectedSubjectAssignmentFilter = Number.isFinite(assignmentId) && assignmentId > 0
          ? assignmentId
          : 'ALL';
      });

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadAssessments();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredAssessments(): Assessment[] {
    const query = this.searchTerm.trim().toLowerCase();

    return [...this.assessments]
      .filter(assessment =>
        this.selectedStatusFilter === 'ALL'
          || assessment.status === this.selectedStatusFilter
      )
      .filter(assessment =>
        this.selectedSubjectAssignmentFilter === 'ALL'
          || Number(assessment.subjectAssignmentId ?? 0) === Number(this.selectedSubjectAssignmentFilter)
      )
      .filter(assessment => {
        if (!query) {
          return true;
        }

        return String(assessment.title ?? '').toLowerCase().includes(query)
          || String(assessment.subjectName ?? '').toLowerCase().includes(query)
          || String(assessment.subjectCode ?? '').toLowerCase().includes(query)
          || String(assessment.gradeName ?? '').toLowerCase().includes(query)
          || this.formatType(assessment.type).toLowerCase().includes(query);
      });
  }

  get totalAssessments(): number {
    return this.assessments.length;
  }

  get publishedAssessments(): number {
    return this.assessments.filter(assessment => assessment.status === AssessmentStatus.PUBLISHED).length;
  }

  get draftAssessments(): number {
    return this.assessments.filter(assessment => assessment.status === AssessmentStatus.DRAFT).length;
  }

  get closedAssessments(): number {
    return this.assessments.filter(assessment => assessment.status === AssessmentStatus.CLOSED).length;
  }

  get subjectFilterOptions(): SchoolSubject[] {
    return [...this.teacherSubjects].sort((left, right) =>
      (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
      || (left.gradeName ?? '').localeCompare(right.gradeName ?? '', undefined, { sensitivity: 'base' })
    );
  }

  get markedProgressLabel(): string {
    const marked = this.assessments.reduce((sum, assessment) => sum + Number(assessment.markedCount ?? 0), 0);
    const total = this.assessments.reduce((sum, assessment) => sum + Number(assessment.studentCount ?? 0), 0);

    if (!total) {
      return 'No marks yet';
    }

    return `${marked}/${total}`;
  }

  formatType(type: AssessmentType | null | undefined): string {
    return String(type ?? '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, value => value.toUpperCase());
  }

  formatStatus(status: AssessmentStatus | null | undefined): string {
    return String(status ?? '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, value => value.toUpperCase());
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'No date set';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: AssessmentStatus | null | undefined): string {
    switch (status) {
      case AssessmentStatus.CLOSED:
        return 'inactive';
      case AssessmentStatus.PUBLISHED:
        return 'active';
      case AssessmentStatus.DRAFT:
      default:
        return 'pending';
    }
  }

  openCreateForm(): void {
    this.editingAssessmentId = null;
    this.formError = '';
    this.assessmentForm = this.createEmptyForm();
    this.showForm = true;
  }

  editAssessment(assessment: Assessment): void {
    this.editingAssessmentId = Number(assessment.id ?? 0) || null;
    this.formError = '';
    this.assessmentForm = {
      subjectAssignmentId: Number(assessment.subjectAssignmentId ?? 0) || null,
      title: assessment.title ?? '',
      description: assessment.description ?? '',
      type: assessment.type ?? AssessmentType.TEST,
      status: assessment.status ?? AssessmentStatus.DRAFT,
      totalMarks: Number(assessment.totalMarks ?? 100),
      passMark: Number(assessment.passMark ?? 50),
      assessmentDate: this.toDateTimeLocal(assessment.assessmentDate),
    };
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingAssessmentId = null;
    this.formError = '';
    this.assessmentForm = this.createEmptyForm();
  }

  saveAssessment(): void {
    if (!this.teacherProfile?.id || !this.selectedSchoolId || this.isSaving) {
      return;
    }

    if (!this.assessmentForm.subjectAssignmentId) {
      this.formError = 'Select a subject first.';
      return;
    }

    if (!this.assessmentForm.title.trim()) {
      this.formError = 'Enter an assessment title.';
      return;
    }

    if (!this.assessmentForm.totalMarks || this.assessmentForm.totalMarks <= 0) {
      this.formError = 'Total marks must be greater than zero.';
      return;
    }

    if (this.assessmentForm.passMark != null && this.assessmentForm.passMark > this.assessmentForm.totalMarks) {
      this.formError = 'Pass mark cannot be greater than total marks.';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    const payload: Assessment = {
      subjectAssignmentId: this.assessmentForm.subjectAssignmentId,
      teacherId: this.teacherProfile.id,
      title: this.assessmentForm.title.trim(),
      description: this.assessmentForm.description.trim() || null,
      type: this.assessmentForm.type,
      status: this.assessmentForm.status,
      totalMarks: this.assessmentForm.totalMarks,
      passMark: this.assessmentForm.passMark,
      assessmentDate: this.toIsoDateTime(this.assessmentForm.assessmentDate),
    };

    const request$ = this.editingAssessmentId
      ? this.backendService.put<Assessment, Assessment>(`assessment/${this.editingAssessmentId}`, payload)
      : this.backendService.post<Assessment, Assessment>('assessment', payload);

    request$.subscribe({
      next: () => {
        this.closeForm();
        this.loadAssessments();
      },
      error: (error: HttpErrorResponse) => {
        this.formError = error.error?.message || 'Failed to save assessment.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }

  viewAssessment(assessment: Assessment): void {
    if (!assessment.id) {
      return;
    }

    this.router.navigate(['/admin/my-assessments', assessment.id]);
  }

  openSubject(assessment: Assessment): void {
    if (!assessment.subjectAssignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-subjects', assessment.subjectAssignmentId]);
  }

  private loadAssessments(): void {
    const schoolId = this.selectedSchoolId;

    if (!schoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.teacherSubjects = [];
      this.assessments = [];
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId }),
      assignments: this.backendService.get<any[]>('subject-assignment', { schoolId }),
    }).subscribe({
      next: ({ teachers, assignments }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId) ?? null;

        if (!teacher?.id) {
          this.teacherProfile = null;
          this.teacherSubjects = [];
          this.assessments = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          this.isLoading = false;
          return;
        }

        this.teacherProfile = teacher;
        this.teacherSubjects = (assignments ?? [])
          .map(assignment => this.mapAssignment(assignment))
          .filter(subject => subject.teacherId === teacher.id);

        this.backendService.get<Assessment[]>('assessment', {
          schoolId,
          teacherId: teacher.id,
        }).subscribe({
          next: assessments => {
            this.assessments = assessments ?? [];
          },
          error: (error: HttpErrorResponse) => {
            this.assessments = [];
            this.errorMessage = error.error?.message || 'Failed to load your assessments.';
          },
          complete: () => {
            this.isLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.teacherSubjects = [];
        this.assessments = [];
        this.errorMessage = error.error?.message || 'Failed to load your assessments.';
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

  private createEmptyForm() {
    return {
      subjectAssignmentId: this.selectedSubjectAssignmentFilter !== 'ALL'
        ? Number(this.selectedSubjectAssignmentFilter)
        : null,
      title: '',
      description: '',
      type: AssessmentType.TEST,
      status: AssessmentStatus.DRAFT,
      totalMarks: 100,
      passMark: 50,
      assessmentDate: '',
    };
  }

  private toIsoDateTime(value: string): string | null {
    if (!value.trim()) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toDateTimeLocal(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
