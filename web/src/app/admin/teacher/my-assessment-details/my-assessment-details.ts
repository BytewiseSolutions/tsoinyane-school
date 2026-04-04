import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { Assessment } from '../assessment';
import { AssessmentMark } from '../assessment-mark';
import { AssessmentStatus } from '../assessment-status';

interface EditableAssessmentMark extends AssessmentMark {
  isDirty: boolean;
}

@Component({
  selector: 'app-my-assessment-details',
  standalone: false,
  templateUrl: './my-assessment-details.html',
  styleUrl: './my-assessment-details.scss',
})
export class MyAssessmentDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  assessmentId: number | null = null;
  activeTab: 'overview' | 'marks' = 'marks';
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  teacherProfile: Teacher | null = null;
  assessment: Assessment | null = null;
  marks: EditableAssessmentMark[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;
    this.assessmentId = Number(this.route.snapshot.paramMap.get('assessmentId'));

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadAssessmentDetails();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get title(): string {
    return this.assessment?.title?.trim() || 'Assessment Details';
  }

  get markedCount(): number {
    return this.marks.filter(mark => mark.score != null).length;
  }

  get pendingCount(): number {
    return this.marks.length - this.markedCount;
  }

  get averagePercentage(): number {
    const scoredMarks = this.marks.filter(mark => mark.score != null);
    if (!scoredMarks.length || !this.assessment?.totalMarks) {
      return 0;
    }

    const totalScore = scoredMarks.reduce((sum, mark) => sum + Number(mark.score ?? 0), 0);
    return Number((((totalScore / scoredMarks.length) / this.assessment.totalMarks) * 100).toFixed(1));
  }

  get passRate(): number {
    const decidedMarks = this.marks.filter(mark => mark.score != null);
    if (!decidedMarks.length) {
      return 0;
    }

    const passedCount = decidedMarks.filter(mark => this.getResultStatus(mark) === 'pass').length;
    return Number(((passedCount / decidedMarks.length) * 100).toFixed(1));
  }

  get hasDirtyMarks(): boolean {
    return this.marks.some(mark => mark.isDirty);
  }

  setActiveTab(tab: 'overview' | 'marks'): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.router.navigate(['/admin/my-assessments']);
  }

  openSubject(): void {
    if (!this.assessment?.subjectAssignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-subjects', this.assessment.subjectAssignmentId]);
  }

  updateScore(mark: EditableAssessmentMark, value: string): void {
    const trimmed = value.trim();
    mark.score = trimmed === '' ? null : Number(trimmed);
    mark.isDirty = true;
  }

  updateComment(mark: EditableAssessmentMark, value: string): void {
    mark.comment = value;
    mark.isDirty = true;
  }

  saveAllMarks(): void {
    if (!this.assessmentId || !this.hasDirtyMarks || this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    const payload: AssessmentMark[] = this.marks.map(mark => ({
      id: mark.id ?? null,
      assessmentId: this.assessmentId,
      studentId: mark.studentId ?? null,
      score: mark.score ?? null,
      comment: mark.comment?.trim() || null,
    }));

    this.backendService.put<AssessmentMark[], AssessmentMark[]>(`assessment/${this.assessmentId}/marks`, payload).subscribe({
      next: marks => {
        this.marks = (marks ?? []).map(mark => ({
          ...mark,
          isDirty: false,
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to save assessment marks.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
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

  getResultStatus(mark: EditableAssessmentMark): 'pass' | 'fail' | 'pending' {
    if (mark.score == null) {
      return 'pending';
    }

    if (mark.passMark != null) {
      return mark.score >= mark.passMark ? 'pass' : 'fail';
    }

    return 'pending';
  }

  getDisplayPercentage(mark: EditableAssessmentMark): string {
    if (mark.percentage != null) {
      return String(mark.percentage);
    }

    if (mark.score == null || !this.assessment?.totalMarks) {
      return '0';
    }

    return ((mark.score / this.assessment.totalMarks) * 100).toFixed(1);
  }

  private loadAssessmentDetails(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.assessment = null;
      this.marks = [];
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
      return;
    }

    if (!Number.isFinite(this.assessmentId) || Number(this.assessmentId) <= 0) {
      this.assessment = null;
      this.marks = [];
      this.errorMessage = 'Assessment was not found.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }),
      assessment: this.backendService.get<Assessment>(`assessment/${this.assessmentId}`),
      marks: this.backendService.get<AssessmentMark[]>(`assessment/${this.assessmentId}/marks`),
    }).subscribe({
      next: ({ teachers, assessment, marks }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId) ?? null;

        if (!teacher?.id) {
          this.teacherProfile = null;
          this.assessment = null;
          this.marks = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          this.isLoading = false;
          return;
        }

        if (Number(assessment.teacherId ?? 0) !== Number(teacher.id)) {
          this.teacherProfile = teacher;
          this.assessment = null;
          this.marks = [];
          this.errorMessage = 'This assessment is not assigned to you in the selected school.';
          this.isLoading = false;
          return;
        }

        this.teacherProfile = teacher;
        this.assessment = assessment;
        this.marks = (marks ?? []).map(mark => ({
          ...mark,
          isDirty: false,
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.assessment = null;
        this.marks = [];
        this.errorMessage = error.error?.message || 'Failed to load this assessment.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
