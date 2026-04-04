import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, concatMap, forkJoin, from, of, takeUntil, tap, toArray } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { Lesson } from '../../subjects/lesson';
import { StudentLesson } from '../../subjects/student-lesson';
import { TimetableEntry } from '../../subjects/timetable-entry';
import { LessonStatus } from '../../subjects/lesson-status';
import { AttendanceStatus } from '../../subjects/attendance-status';
import { HomeworkStatus } from '../../subjects/homework-status';
import { AbsenceReason } from '../../subjects/absence-reason';

@Component({
  selector: 'app-my-lesson-details',
  standalone: false,
  templateUrl: './my-lesson-details.html',
  styleUrl: './my-lesson-details.scss',
})
export class MyLessonDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  readonly AttendanceStatus = AttendanceStatus;
  readonly HomeworkStatus = HomeworkStatus;
  readonly AbsenceReason = AbsenceReason;
  readonly attendanceStatusOptions = Object.values(AttendanceStatus);
  readonly homeworkStatusOptions = Object.values(HomeworkStatus);
  readonly absenceReasonOptions = Object.values(AbsenceReason);

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  lessonId: number | null = null;
  activeTab: 'overview' | 'students' = 'overview';
  isLoading = false;
  studentsLoading = false;
  isSavingLesson = false;
  isBulkSavingStudentLessons = false;
  savingStudentLessonIds: number[] = [];
  errorMessage = '';
  studentsError = '';
  studentsActionMessage = '';
  lessonActionMessage = '';
  showCancelEditor = false;
  cancellationReasonDraft = '';

  teacherProfile: Teacher | null = null;
  lesson: Lesson | null = null;
  timetable: TimetableEntry | null = null;
  studentLessons: StudentLesson[] = [];
  studentLessonDrafts: Record<number, StudentLesson> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;
    this.lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadLessonDetails();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get statusLabel(): string {
    return this.getStatusLabel(this.lesson?.status);
  }

  get learnerCount(): number {
    return this.lesson?.studentCount ?? this.studentLessons.length;
  }

  get gradeLabel(): string {
    return this.timetable?.gradeName?.trim() || 'N/A';
  }

  get dayLabel(): string {
    return this.getDayOfWeekLabel(this.timetable?.dayOfWeek);
  }

  get submittedLabel(): string {
    return this.lesson?.submitted ? 'Yes' : 'No';
  }

  get canSubmitLesson(): boolean {
    return !!this.lesson && this.lesson.status !== LessonStatus.SUBMITTED;
  }

  get canCancelLesson(): boolean {
    return !!this.lesson && this.lesson.status !== LessonStatus.CANCELLED;
  }

  get canReopenLesson(): boolean {
    return !!this.lesson && this.lesson.status === LessonStatus.CANCELLED;
  }

  get hasStudentLessons(): boolean {
    return this.studentLessons.length > 0;
  }

  get presentCount(): number {
    return this.lesson?.attendancePresentCount ?? 0;
  }

  get lateCount(): number {
    return this.lesson?.attendanceLateCount ?? 0;
  }

  get absentCount(): number {
    return this.lesson?.attendanceAbsentCount ?? 0;
  }

  get attendancePendingCount(): number {
    return this.lesson?.attendancePendingCount ?? 0;
  }

  get homeworkDoneCount(): number {
    return this.lesson?.homeworkDoneCount ?? 0;
  }

  get homeworkNotDoneCount(): number {
    return this.lesson?.homeworkNotDoneCount ?? 0;
  }

  get homeworkNoneCount(): number {
    return this.lesson?.homeworkNoneCount ?? 0;
  }

  get homeworkPendingCount(): number {
    return this.lesson?.homeworkPendingCount ?? 0;
  }

  get sortedStudentLessons(): StudentLesson[] {
    return [...this.studentLessons].sort((left, right) =>
      (left.studentNumber ?? '').localeCompare(right.studentNumber ?? '', undefined, { sensitivity: 'base' })
      || (left.studentName ?? '').localeCompare(right.studentName ?? '', undefined, { sensitivity: 'base' })
    );
  }

  setActiveTab(tab: 'overview' | 'students'): void {
    this.activeTab = tab;
  }

  get totalStudentsCount(): number {
    return this.studentLessons.length;
  }

  get pendingStudentUpdateCount(): number {
    return this.studentLessons.filter(student => this.isStudentLessonDirty(student)).length;
  }

  get savedStudentUpdateCount(): number {
    return Math.max(0, this.totalStudentsCount - this.pendingStudentUpdateCount);
  }

  get missingAbsenceReasonCount(): number {
    return this.studentLessons.filter(student => this.isAbsenceReasonRequired(student)).length;
  }

  get canBulkSaveStudentLessons(): boolean {
    return this.pendingStudentUpdateCount > 0
      && this.missingAbsenceReasonCount === 0
      && !this.isBulkSavingStudentLessons
      && this.savingStudentLessonIds.length === 0;
  }

  goBack(): void {
    this.router.navigate(['/admin/my-lessons']);
  }

  openRelatedSubject(): void {
    if (!this.lesson?.subjectAssignmentId) {
      return;
    }

    this.router.navigate(['/admin/my-subjects', this.lesson.subjectAssignmentId]);
  }

  formatLessonDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  }

  formatLessonTime(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatTimeRange(): string {
    if (!this.lesson) {
      return 'N/A';
    }

    return `${this.formatLessonTime(this.lesson.startTime)} - ${this.formatLessonTime(this.lesson.endTime)}`;
  }

  getStatusLabel(status: LessonStatus | string | null | undefined): string {
    return String(status ?? 'PENDING').replace(/_/g, ' ');
  }

  getStatusClass(status: LessonStatus | string | null | undefined): string {
    switch (status) {
      case LessonStatus.SUBMITTED:
        return 'active';
      case LessonStatus.CANCELLED:
        return 'inactive';
      case LessonStatus.PENDING:
      default:
        return 'pending';
    }
  }

  getStudentDraft(studentLessonId: number | null | undefined): StudentLesson {
    const key = Number(studentLessonId ?? 0);
    return this.studentLessonDrafts[key] ?? {
      lessonId: this.lesson?.id ?? null,
      studentId: null,
    };
  }

  onAttendanceStatusChanged(studentLessonId: number | null | undefined): void {
    const draft = this.getStudentDraft(studentLessonId);
    this.studentsError = '';
    this.studentsActionMessage = '';
    if (draft.attendanceStatus !== AttendanceStatus.ABSENT) {
      draft.absenceReason = null;
      draft.absenceComment = null;
    }
  }

  onStudentDraftChanged(): void {
    this.studentsError = '';
    this.studentsActionMessage = '';
  }

  isSavingStudentLesson(studentLessonId: number | null | undefined): boolean {
    return this.savingStudentLessonIds.includes(Number(studentLessonId ?? 0));
  }

  isStudentLessonDirty(studentLesson: StudentLesson): boolean {
    const studentLessonId = Number(studentLesson.id ?? 0);
    if (!studentLessonId) {
      return false;
    }

    const draft = this.getStudentDraft(studentLessonId);
    const originalState = this.getComparableStudentLessonState(studentLesson);
    const draftState = this.getComparableStudentLessonState({
      ...studentLesson,
      ...draft,
    });

    return originalState.attendanceStatus !== draftState.attendanceStatus
      || originalState.absenceReason !== draftState.absenceReason
      || originalState.homeworkStatus !== draftState.homeworkStatus
      || originalState.comment !== draftState.comment
      || originalState.absenceComment !== draftState.absenceComment;
  }

  isAbsenceReasonRequired(studentLesson: StudentLesson): boolean {
    const draft = this.getStudentDraft(studentLesson.id);
    return (draft.attendanceStatus ?? AttendanceStatus.PENDING) === AttendanceStatus.ABSENT
      && !draft.absenceReason;
  }

  getStudentValidationMessage(studentLesson: StudentLesson): string {
    return this.isAbsenceReasonRequired(studentLesson)
      ? 'Absence reason is required for absent learners.'
      : '';
  }

  getStudentSaveStateLabel(studentLesson: StudentLesson): string {
    if (this.isSavingStudentLesson(studentLesson.id)) {
      return 'Saving...';
    }

    return this.isStudentLessonDirty(studentLesson) ? 'Unsaved changes' : 'Saved';
  }

  getStudentSaveStateClass(studentLesson: StudentLesson): string {
    if (this.isSavingStudentLesson(studentLesson.id)) {
      return 'saving';
    }

    return this.isStudentLessonDirty(studentLesson) ? 'unsaved' : 'saved';
  }

  formatEnumLabel(value: string | null | undefined): string {
    return String(value ?? 'PENDING')
      .toLowerCase()
      .split('_')
      .map(part => part ? part[0].toUpperCase() + part.slice(1) : '')
      .join(' ');
  }

  getAttendanceBadgeClass(status: AttendanceStatus | null | undefined): string {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'present';
      case AttendanceStatus.LATE:
        return 'late';
      case AttendanceStatus.ABSENT:
        return 'absent';
      case AttendanceStatus.PENDING:
      default:
        return 'pending';
    }
  }

  getHomeworkBadgeClass(status: HomeworkStatus | null | undefined): string {
    switch (status) {
      case HomeworkStatus.DONE:
        return 'done';
      case HomeworkStatus.NOT_DONE:
        return 'not-done';
      case HomeworkStatus.NONE:
        return 'none';
      case HomeworkStatus.PENDING:
      default:
        return 'pending';
    }
  }

  saveStudentLesson(studentLesson: StudentLesson): void {
    const studentLessonId = Number(studentLesson.id ?? 0);
    if (!studentLessonId || this.isSavingStudentLesson(studentLessonId)) {
      return;
    }

    const request$ = this.buildStudentLessonSaveRequest(studentLesson);
    if (!request$) {
      return;
    }

    this.savingStudentLessonIds = [...this.savingStudentLessonIds, studentLessonId];
    this.studentsError = '';
    this.studentsActionMessage = '';

    request$.subscribe({
      next: updatedStudentLesson => {
        this.applyUpdatedStudentLesson(updatedStudentLesson);
      },
      error: (error: HttpErrorResponse) => {
        this.studentsError = error.error?.message || 'Failed to save student lesson details.';
      },
      complete: () => {
        this.savingStudentLessonIds = this.savingStudentLessonIds.filter(id => id !== studentLessonId);
      },
    });
  }

  saveAllStudentLessons(): void {
    const dirtyStudentLessons = this.studentLessons.filter(student => this.isStudentLessonDirty(student));
    if (!dirtyStudentLessons.length || this.isBulkSavingStudentLessons) {
      return;
    }

    const invalidStudent = dirtyStudentLessons.find(student => this.isAbsenceReasonRequired(student));
    if (invalidStudent) {
      this.studentsError = `Provide an absence reason for ${invalidStudent.studentName || 'the absent learner'} before saving.`;
      return;
    }

    const requests = dirtyStudentLessons
      .map(student => this.buildStudentLessonSaveRequest(student))
      .filter((request): request is Observable<StudentLesson> => !!request);

    if (!requests.length) {
      return;
    }

    const savingIds = dirtyStudentLessons
      .map(student => Number(student.id ?? 0))
      .filter(studentLessonId => studentLessonId > 0);

    this.isBulkSavingStudentLessons = true;
    this.savingStudentLessonIds = [...new Set([...this.savingStudentLessonIds, ...savingIds])];
    this.studentsError = '';
    this.studentsActionMessage = '';

    from(requests)
      .pipe(
        concatMap(request => request),
        tap(updatedStudentLesson => this.applyUpdatedStudentLesson(updatedStudentLesson)),
        toArray(),
      )
      .subscribe({
        next: updatedStudentLessons => {
          const savedCount = updatedStudentLessons.length;
          this.studentsActionMessage = savedCount === 1
            ? 'Saved changes for 1 learner.'
            : `Saved changes for ${savedCount} learners.`;
        },
        error: (error: HttpErrorResponse) => {
          this.studentsError = error.error?.message || 'Failed to save all student lesson details.';
        },
        complete: () => {
          this.isBulkSavingStudentLessons = false;
          this.savingStudentLessonIds = this.savingStudentLessonIds.filter(id => !savingIds.includes(id));
        },
      });
  }

  submitLesson(): void {
    if (!this.lesson || this.isSavingLesson) {
      return;
    }

    this.updateLesson({
      status: LessonStatus.SUBMITTED,
      submitted: true,
    }, 'Lesson submitted successfully.');
  }

  toggleCancelEditor(): void {
    this.lessonActionMessage = '';
    this.errorMessage = '';
    this.showCancelEditor = !this.showCancelEditor;
    this.cancellationReasonDraft = this.lesson?.cancellationReason ?? '';
  }

  cancelLesson(): void {
    if (!this.lesson || this.isSavingLesson) {
      return;
    }

    const reason = this.normalizeNullable(this.cancellationReasonDraft);
    if (!reason) {
      this.errorMessage = 'Provide a cancellation reason before cancelling the lesson.';
      return;
    }

    this.updateLesson({
      status: LessonStatus.CANCELLED,
      submitted: false,
      cancellationReason: reason,
    }, 'Lesson cancelled successfully.', () => {
      this.showCancelEditor = false;
    });
  }

  reopenLesson(): void {
    if (!this.lesson || this.isSavingLesson) {
      return;
    }

    this.updateLesson({
      status: LessonStatus.PENDING,
      submitted: false,
      cancellationReason: null,
    }, 'Lesson reopened successfully.', () => {
      this.showCancelEditor = false;
      this.cancellationReasonDraft = '';
    });
  }

  private loadLessonDetails(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.lesson = null;
      this.timetable = null;
      this.studentLessons = [];
      this.errorMessage = this.selectedSchoolId ? 'Teacher profile was not found.' : '';
      return;
    }

    if (!Number.isFinite(this.lessonId) || Number(this.lessonId) <= 0) {
      this.errorMessage = 'Lesson not found.';
      this.lesson = null;
      this.timetable = null;
      this.studentLessons = [];
      return;
    }

    const lessonId = Number(this.lessonId);

    this.isLoading = true;
    this.studentsLoading = true;
    this.errorMessage = '';
    this.studentsError = '';
    this.studentsActionMessage = '';

    forkJoin({
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }),
      lesson: this.backendService.get<Lesson>(`lesson/${lessonId}`),
      studentLessons: this.backendService.get<StudentLesson[]>('student-lesson', { lessonId }),
    }).subscribe({
      next: ({ teachers, lesson, studentLessons }) => {
        const teacher = (teachers ?? []).find(item => item.userId === this.currentUserId) ?? null;

        if (!teacher?.id) {
          this.teacherProfile = null;
          this.lesson = null;
          this.timetable = null;
          this.studentLessons = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          return;
        }

        if (lesson.teacherId !== teacher.id) {
          this.teacherProfile = teacher;
          this.lesson = null;
          this.timetable = null;
          this.studentLessons = [];
          this.errorMessage = 'This lesson is not assigned to you in the selected school.';
          return;
        }

        this.teacherProfile = teacher;
        this.lesson = lesson;
        this.studentLessons = studentLessons ?? [];
        this.lessonActionMessage = '';
        this.showCancelEditor = false;
        this.cancellationReasonDraft = lesson.cancellationReason ?? '';
        this.studentLessonDrafts = Object.fromEntries(
          this.studentLessons
            .filter(item => item.id != null)
            .map(item => [Number(item.id), { ...item }])
        );

        const timetableRequest: import('rxjs').Observable<TimetableEntry | null> = lesson.timetableId
          ? this.backendService.get<TimetableEntry>(`timetable/${lesson.timetableId}`)
          : of<TimetableEntry | null>(null);

        timetableRequest.subscribe({
          next: (timetable: TimetableEntry | null) => {
            this.timetable = timetable;
          },
          error: (error: HttpErrorResponse) => {
            this.timetable = null;
            this.studentsError = error.error?.message || 'Failed to load linked timetable details.';
          },
          complete: () => {
            this.isLoading = false;
            this.studentsLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.lesson = null;
        this.timetable = null;
        this.studentLessons = [];
        this.errorMessage = error.error?.message || 'Failed to load lesson details.';
        this.isLoading = false;
        this.studentsLoading = false;
      },
    });
  }

  private getDayOfWeekLabel(dayOfWeek: string | null | undefined): string {
    return (dayOfWeek ?? '')
      .toLowerCase()
      .replace(/^\w/, value => value.toUpperCase()) || 'N/A';
  }

  private buildStudentLessonSaveRequest(studentLesson: StudentLesson): Observable<StudentLesson> | null {
    const studentLessonId = Number(studentLesson.id ?? 0);
    if (!studentLessonId) {
      return null;
    }

    const payload = this.buildStudentLessonPayload(studentLesson);
    if (!payload) {
      return null;
    }

    return this.backendService.put<StudentLesson, StudentLesson>(`student-lesson/${studentLessonId}`, payload);
  }

  private buildStudentLessonPayload(studentLesson: StudentLesson): StudentLesson | null {
    const draft = this.getStudentDraft(studentLesson.id);
    const attendanceStatus = draft.attendanceStatus ?? AttendanceStatus.PENDING;

    if (attendanceStatus === AttendanceStatus.ABSENT && !draft.absenceReason) {
      this.studentsError = `Select an absence reason for ${studentLesson.studentName || 'the absent learner'}.`;
      return null;
    }

    return {
      ...studentLesson,
      lessonId: studentLesson.lessonId ?? this.lesson?.id ?? null,
      studentId: studentLesson.studentId ?? null,
      attendanceStatus,
      homeworkStatus: draft.homeworkStatus ?? HomeworkStatus.PENDING,
      absenceReason: attendanceStatus === AttendanceStatus.ABSENT ? (draft.absenceReason ?? null) : null,
      absenceComment: attendanceStatus === AttendanceStatus.ABSENT
        ? this.normalizeNullable(draft.absenceComment)
        : null,
      comment: this.normalizeNullable(draft.comment),
    };
  }

  private updateLesson(overrides: Partial<Lesson>, successMessage: string, onSuccess?: () => void): void {
    if (!this.lesson?.id) {
      return;
    }

    this.isSavingLesson = true;
    this.errorMessage = '';
    this.lessonActionMessage = '';

    const payload: Lesson = {
      ...this.lesson,
      ...overrides,
      id: this.lesson.id,
      timetableId: this.lesson.timetableId ?? this.timetable?.id ?? null,
      subjectAssignmentId: this.lesson.subjectAssignmentId ?? null,
      subjectId: this.lesson.subjectId ?? null,
      teacherId: this.lesson.teacherId ?? this.teacherProfile?.id ?? null,
      cancellationReason: Object.prototype.hasOwnProperty.call(overrides, 'cancellationReason')
        ? (overrides.cancellationReason ?? null)
        : (this.lesson.cancellationReason ?? null),
      submitted: overrides.submitted ?? this.lesson.submitted ?? false,
      status: overrides.status ?? this.lesson.status ?? LessonStatus.PENDING,
    };

    this.backendService.put<Lesson, Lesson>(`lesson/${this.lesson.id}`, payload).subscribe({
      next: updatedLesson => {
        this.lesson = updatedLesson;
        this.lessonActionMessage = successMessage;
        this.cancellationReasonDraft = updatedLesson.cancellationReason ?? '';
        onSuccess?.();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update lesson.';
      },
      complete: () => {
        this.isSavingLesson = false;
      },
    });
  }

  private syncLessonStats(): void {
    if (!this.lesson) {
      return;
    }

    const stats = this.calculateLessonStats(this.studentLessons);
    this.lesson = {
      ...this.lesson,
      ...stats,
    };
  }

  private applyUpdatedStudentLesson(updatedStudentLesson: StudentLesson): void {
    this.studentLessons = this.studentLessons.map(item =>
      item.id === updatedStudentLesson.id ? updatedStudentLesson : item
    );
    if (updatedStudentLesson.id != null) {
      this.studentLessonDrafts[Number(updatedStudentLesson.id)] = { ...updatedStudentLesson };
    }
    this.syncLessonStats();
  }

  private getComparableStudentLessonState(studentLesson: StudentLesson): {
    attendanceStatus: AttendanceStatus;
    absenceReason: AbsenceReason | null;
    homeworkStatus: HomeworkStatus;
    comment: string | null;
    absenceComment: string | null;
  } {
    const attendanceStatus = studentLesson.attendanceStatus ?? AttendanceStatus.PENDING;

    return {
      attendanceStatus,
      absenceReason: attendanceStatus === AttendanceStatus.ABSENT ? (studentLesson.absenceReason ?? null) : null,
      homeworkStatus: studentLesson.homeworkStatus ?? HomeworkStatus.PENDING,
      comment: this.normalizeNullable(studentLesson.comment),
      absenceComment: attendanceStatus === AttendanceStatus.ABSENT
        ? this.normalizeNullable(studentLesson.absenceComment)
        : null,
    };
  }

  private calculateLessonStats(studentLessons: StudentLesson[]): Pick<Lesson, 'studentCount' | 'attendancePresentCount' | 'attendanceLateCount' | 'attendanceAbsentCount' | 'attendancePendingCount' | 'homeworkDoneCount' | 'homeworkNotDoneCount' | 'homeworkNoneCount' | 'homeworkPendingCount'> {
    const stats: Pick<Lesson, 'studentCount' | 'attendancePresentCount' | 'attendanceLateCount' | 'attendanceAbsentCount' | 'attendancePendingCount' | 'homeworkDoneCount' | 'homeworkNotDoneCount' | 'homeworkNoneCount' | 'homeworkPendingCount'> = {
      studentCount: studentLessons.length,
      attendancePresentCount: 0,
      attendanceLateCount: 0,
      attendanceAbsentCount: 0,
      attendancePendingCount: 0,
      homeworkDoneCount: 0,
      homeworkNotDoneCount: 0,
      homeworkNoneCount: 0,
      homeworkPendingCount: 0,
    };

    studentLessons.forEach(studentLesson => {
      switch (studentLesson.attendanceStatus) {
        case AttendanceStatus.PRESENT:
          stats.attendancePresentCount = (stats.attendancePresentCount ?? 0) + 1;
          break;
        case AttendanceStatus.LATE:
          stats.attendanceLateCount = (stats.attendanceLateCount ?? 0) + 1;
          break;
        case AttendanceStatus.ABSENT:
          stats.attendanceAbsentCount = (stats.attendanceAbsentCount ?? 0) + 1;
          break;
        default:
          stats.attendancePendingCount = (stats.attendancePendingCount ?? 0) + 1;
          break;
      }

      switch (studentLesson.homeworkStatus) {
        case HomeworkStatus.DONE:
          stats.homeworkDoneCount = (stats.homeworkDoneCount ?? 0) + 1;
          break;
        case HomeworkStatus.NOT_DONE:
          stats.homeworkNotDoneCount = (stats.homeworkNotDoneCount ?? 0) + 1;
          break;
        case HomeworkStatus.NONE:
          stats.homeworkNoneCount = (stats.homeworkNoneCount ?? 0) + 1;
          break;
        default:
          stats.homeworkPendingCount = (stats.homeworkPendingCount ?? 0) + 1;
          break;
      }
    });

    return stats;
  }

  private normalizeNullable(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
