import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { TimetableEntry } from '../../subjects/timetable-entry';
import { Lesson } from '../../subjects/lesson';
import { LessonStatus } from '../../subjects/lesson-status';

interface MyLessonRow extends Lesson {
  gradeName?: string | null;
  dayOfWeek?: string | null;
}

@Component({
  selector: 'app-my-lessons',
  standalone: false,
  templateUrl: './my-lessons.html',
  styleUrl: './my-lessons.scss',
})
export class MyLessons implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly pageSizeOptions = [10, 25, 50];
  readonly LessonStatus = LessonStatus;
  readonly lessonStatusOptions: Array<LessonStatus | 'ALL'> = [
    'ALL',
    LessonStatus.PENDING,
    LessonStatus.SUBMITTED,
    LessonStatus.CANCELLED,
  ];

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  selectedStatusFilter: LessonStatus | 'ALL' = 'ALL';
  selectedSort = 'date-asc';
  lessonPageSize = 10;
  lessonCurrentPage = 1;

  teacherProfile: Teacher | null = null;
  teacherSubjects: SchoolSubject[] = [];
  timetables: TimetableEntry[] = [];
  lessons: MyLessonRow[] = [];

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
        this.loadMyLessons();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredLessons(): MyLessonRow[] {
    const query = this.searchTerm.trim().toLowerCase();

    return [...this.lessons]
      .filter(lesson => this.matchesLessonSearch(lesson, query))
      .filter(lesson => this.selectedStatusFilter === 'ALL' || lesson.status === this.selectedStatusFilter)
      .sort((left, right) => this.compareLessons(left, right));
  }

  get paginatedLessons(): MyLessonRow[] {
    const start = (this.safeCurrentPage - 1) * this.lessonPageSize;
    return this.filteredLessons.slice(start, start + this.lessonPageSize);
  }

  get totalLessons(): number {
    return this.lessons.length;
  }

  get pendingLessonsCount(): number {
    return this.lessons.filter(lesson => lesson.status === LessonStatus.PENDING || !lesson.status).length;
  }

  get submittedLessonsCount(): number {
    return this.lessons.filter(lesson => lesson.status === LessonStatus.SUBMITTED).length;
  }

  get cancelledLessonsCount(): number {
    return this.lessons.filter(lesson => lesson.status === LessonStatus.CANCELLED).length;
  }

  get lessonTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLessons.length / this.lessonPageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.lessonCurrentPage, this.lessonTotalPages);
  }

  get lessonPageStart(): number {
    if (!this.filteredLessons.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.lessonPageSize + 1;
  }

  get lessonPageEnd(): number {
    return Math.min(this.safeCurrentPage * this.lessonPageSize, this.filteredLessons.length);
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

  formatLessonSession(lesson: MyLessonRow): string {
    const date = this.formatLessonDate(lesson.date || lesson.startTime);
    const startTime = this.formatLessonTime(lesson.startTime);
    const endTime = this.formatLessonTime(lesson.endTime);

    return `${date} ${startTime} - ${endTime}`;
  }

  getAttendanceCompletion(lesson: MyLessonRow): string {
    const total = lesson.studentCount ?? 0;
    if (!total) {
      return 'N/A';
    }

    const present = this.toPercent(lesson.attendancePresentCount, total);
    const late = this.toPercent(lesson.attendanceLateCount, total);
    const absent = this.toPercent(lesson.attendanceAbsentCount, total);
    const pending = this.toPercent(lesson.attendancePendingCount, total);
    const summary = [`P:${present}%`, `L:${late}%`, `A:${absent}%`];

    if ((lesson.attendancePendingCount ?? 0) > 0) {
      summary.push(`Pending:${pending}%`);
    }

    return summary.join(' | ');
  }

  getHomeworkCompletion(lesson: MyLessonRow): string {
    const total = lesson.studentCount ?? 0;
    if (!total) {
      return 'N/A';
    }

    return `${this.toPercent(lesson.homeworkDoneCount, total)}%`;
  }

  onFiltersChanged(): void {
    this.lessonCurrentPage = 1;
  }

  onPageSizeChanged(): void {
    this.lessonCurrentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) {
      this.lessonCurrentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.lessonTotalPages) {
      this.lessonCurrentPage = this.safeCurrentPage + 1;
    }
  }

  viewLesson(lesson: MyLessonRow): void {
    if (!lesson.id) {
      return;
    }

    this.router.navigate(['/admin/my-lessons', lesson.id]);
  }

  private loadMyLessons(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.teacherSubjects = [];
      this.timetables = [];
      this.lessons = [];
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
          this.timetables = [];
          this.lessons = [];
          this.errorMessage = 'No teacher profile was found for the selected school.';
          this.isLoading = false;
          return;
        }

        this.teacherProfile = teacher;
        this.teacherSubjects = (assignments ?? [])
          .map(assignment => this.mapAssignment(assignment))
          .filter(subject => subject.teacherId === teacher.id);

        const timetableRequests = this.teacherSubjects
          .filter(subject => subject.subjectId != null || subject.id != null)
          .map(subject => this.backendService.get<TimetableEntry[]>('timetable', { subjectId: subject.subjectId ?? subject.id! }));

        const timetables$ = timetableRequests.length
          ? forkJoin(timetableRequests)
          : of([] as TimetableEntry[][]);

        timetables$.subscribe({
          next: (timetableGroups) => {
            const subjectMap = new Map(
              this.teacherSubjects.map(subject => [subject.subjectId ?? subject.id!, subject])
            );

            this.timetables = timetableGroups
              .flat()
              .map(entry => {
                const subject = subjectMap.get(entry.subjectId ?? 0);

                return {
                  ...entry,
                  subjectName: entry.subjectName ?? subject?.name ?? 'Unknown Subject',
                  gradeName: entry.gradeName ?? subject?.gradeName ?? 'N/A',
                  studentCount: entry.studentCount ?? entry.studentIds?.length ?? subject?.studentCount ?? 0,
                  lessonCount: entry.lessonCount ?? 0,
                  subjectAssignmentId: entry.subjectAssignmentId ?? subject?.assignmentId ?? null,
                };
              });

            const lessonRequests = this.timetables
              .filter(timetable => timetable.id != null)
              .map(timetable => this.backendService.get<Lesson[]>('lesson', { timetableId: timetable.id! }));

            const lessons$ = lessonRequests.length
              ? forkJoin(lessonRequests)
              : of([] as Lesson[][]);

            lessons$.subscribe({
              next: lessonGroups => {
                const timetableMap = new Map(
                  this.timetables.map(timetable => [timetable.id!, timetable])
                );

                this.lessons = lessonGroups
                  .flat()
                  .map(lesson => {
                    const timetable = timetableMap.get(lesson.timetableId ?? 0);
                    return {
                      ...lesson,
                      subjectName: lesson.subjectName ?? timetable?.subjectName ?? 'Unknown Subject',
                      gradeName: timetable?.gradeName ?? null,
                      dayOfWeek: timetable?.dayOfWeek ?? null,
                      studentCount: lesson.studentCount ?? timetable?.studentCount ?? 0,
                    };
                  });
                this.lessonCurrentPage = 1;
              },
              error: (error: HttpErrorResponse) => {
                this.lessons = [];
                this.errorMessage = error.error?.message || 'Failed to load your lessons.';
              },
              complete: () => {
                this.isLoading = false;
              },
            });
          },
          error: (error: HttpErrorResponse) => {
            this.timetables = [];
            this.lessons = [];
            this.errorMessage = error.error?.message || 'Failed to load your lessons.';
            this.isLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.teacherSubjects = [];
        this.timetables = [];
        this.lessons = [];
        this.errorMessage = error.error?.message || 'Failed to load your lessons.';
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

  private matchesLessonSearch(lesson: MyLessonRow, query: string): boolean {
    if (!query) {
      return true;
    }

    return String(lesson.subjectName ?? '').toLowerCase().includes(query)
      || String(lesson.gradeName ?? '').toLowerCase().includes(query)
      || String(lesson.dayOfWeek ?? '').toLowerCase().includes(query)
      || this.formatLessonSession(lesson).toLowerCase().includes(query)
      || this.getStatusLabel(lesson.status).toLowerCase().includes(query);
  }

  private compareLessons(left: MyLessonRow, right: MyLessonRow): number {
    switch (this.selectedSort) {
      case 'date-desc':
        return this.compareDate(right.date || right.startTime, left.date || left.startTime);
      case 'subject-asc':
        return this.compareText(left.subjectName, right.subjectName);
      case 'subject-desc':
        return this.compareText(right.subjectName, left.subjectName);
      case 'status-asc':
        return this.compareText(left.status || 'PENDING', right.status || 'PENDING');
      case 'status-desc':
        return this.compareText(right.status || 'PENDING', left.status || 'PENDING');
      case 'date-asc':
      default:
        return this.compareDate(left.date || left.startTime, right.date || right.startTime);
    }
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private compareDate(left: string | null | undefined, right: string | null | undefined): number {
    const leftTime = left ? new Date(left).getTime() : 0;
    const rightTime = right ? new Date(right).getTime() : 0;
    return leftTime - rightTime;
  }

  private toPercent(value: number | null | undefined, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round(((value ?? 0) / total) * 100);
  }
}
