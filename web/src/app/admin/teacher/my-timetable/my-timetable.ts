import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { getStoredUser } from '../../../auth/auth-session';
import { Teacher } from '../../teachers/teacher';
import { SchoolSubject } from '../../subjects/subject';
import { TimetableEntry } from '../../subjects/timetable-entry';

@Component({
  selector: 'app-my-timetable',
  standalone: false,
  templateUrl: './my-timetable.html',
  styleUrl: './my-timetable.scss',
})
export class MyTimetable implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly pageSizeOptions = [10, 25, 50];
  readonly dayOfWeekOptions = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ];

  currentUserId: number | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  selectedDayFilter: string | 'ALL' = 'ALL';
  selectedSort = 'day-asc';
  timetablePageSize = 10;
  timetableCurrentPage = 1;

  teacherProfile: Teacher | null = null;
  teacherSubjects: SchoolSubject[] = [];
  timetables: TimetableEntry[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.currentUserId = getStoredUser()?.id ?? null;

    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadMyTimetable();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredTimetables(): TimetableEntry[] {
    const query = this.searchTerm.trim().toLowerCase();

    return [...this.timetables]
      .filter(entry => this.matchesSearch(entry, query))
      .filter(entry => this.selectedDayFilter === 'ALL' || entry.dayOfWeek === this.selectedDayFilter)
      .sort((left, right) => this.compareTimetables(left, right));
  }

  get paginatedTimetables(): TimetableEntry[] {
    const start = (this.safeCurrentPage - 1) * this.timetablePageSize;
    return this.filteredTimetables.slice(start, start + this.timetablePageSize);
  }

  get timetableTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTimetables.length / this.timetablePageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.timetableCurrentPage, this.timetableTotalPages);
  }

  get timetablePageStart(): number {
    if (!this.filteredTimetables.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.timetablePageSize + 1;
  }

  get timetablePageEnd(): number {
    return Math.min(this.safeCurrentPage * this.timetablePageSize, this.filteredTimetables.length);
  }

  get activeSubjectCount(): number {
    return this.teacherSubjects.filter(subject => subject.status === 'ACTIVE').length;
  }

  get totalSlots(): number {
    return this.timetables.length;
  }

  get gradeCount(): number {
    return new Set(
      this.teacherSubjects
        .map(subject => subject.gradeId)
        .filter((gradeId): gradeId is number => gradeId != null)
    ).size;
  }

  get totalWeeklyHours(): string {
    const totalMinutes = this.timetables.reduce((sum, entry) => sum + this.getTimetableDurationMinutes(entry), 0);

    if (!totalMinutes) {
      return '0 hrs';
    }

    const hours = totalMinutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hrs`;
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

  getDayLabel(dayOfWeek: string | null | undefined): string {
    return (dayOfWeek ?? '')
      .toLowerCase()
      .replace(/^\w/, value => value.toUpperCase());
  }

  formatTimeRange(entry: TimetableEntry): string {
    return `${this.normalizeTime(entry.startTime)} - ${this.normalizeTime(entry.endTime)}`;
  }

  onFiltersChanged(): void {
    this.timetableCurrentPage = 1;
  }

  onPageSizeChanged(): void {
    this.timetableCurrentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) {
      this.timetableCurrentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.timetableTotalPages) {
      this.timetableCurrentPage = this.safeCurrentPage + 1;
    }
  }

  private loadMyTimetable(): void {
    if (!this.selectedSchoolId || !this.currentUserId) {
      this.teacherProfile = null;
      this.teacherSubjects = [];
      this.timetables = [];
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
                  startTime: this.normalizeTime(entry.startTime),
                  endTime: this.normalizeTime(entry.endTime),
                  subjectName: entry.subjectName ?? subject?.name ?? 'Unknown Subject',
                  gradeName: entry.gradeName ?? subject?.gradeName ?? 'N/A',
                  studentCount: entry.studentCount ?? entry.studentIds?.length ?? subject?.studentCount ?? 0,
                  lessonCount: entry.lessonCount ?? 0,
                  teacherName: entry.teacherName ?? subject?.teacherName ?? teacher.userFullName ?? null,
                  subjectAssignmentId: entry.subjectAssignmentId ?? subject?.assignmentId ?? null,
                };
              });
            this.timetableCurrentPage = 1;
          },
          error: (error: HttpErrorResponse) => {
            this.timetables = [];
            this.errorMessage = error.error?.message || 'Failed to load your timetable.';
          },
          complete: () => {
            this.isLoading = false;
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.teacherProfile = null;
        this.teacherSubjects = [];
        this.timetables = [];
        this.errorMessage = error.error?.message || 'Failed to load your timetable.';
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

  private matchesSearch(entry: TimetableEntry, query: string): boolean {
    if (!query) {
      return true;
    }

    return this.getDayLabel(entry.dayOfWeek).toLowerCase().includes(query)
      || this.normalizeTime(entry.startTime).toLowerCase().includes(query)
      || this.normalizeTime(entry.endTime).toLowerCase().includes(query)
      || String(entry.subjectName ?? '').toLowerCase().includes(query)
      || String(entry.gradeName ?? '').toLowerCase().includes(query)
      || String(entry.studentCount ?? entry.studentIds?.length ?? 0).includes(query);
  }

  private compareTimetables(left: TimetableEntry, right: TimetableEntry): number {
    switch (this.selectedSort) {
      case 'day-desc':
        return this.compareDay(right.dayOfWeek, left.dayOfWeek)
          || this.compareText(right.startTime, left.startTime);
      case 'time-desc':
        return this.compareText(right.startTime, left.startTime);
      case 'subject-asc':
        return this.compareText(left.subjectName, right.subjectName);
      case 'subject-desc':
        return this.compareText(right.subjectName, left.subjectName);
      case 'learners-desc':
        return (right.studentCount ?? right.studentIds?.length ?? 0) - (left.studentCount ?? left.studentIds?.length ?? 0);
      case 'learners-asc':
        return (left.studentCount ?? left.studentIds?.length ?? 0) - (right.studentCount ?? right.studentIds?.length ?? 0);
      case 'time-asc':
        return this.compareText(left.startTime, right.startTime);
      case 'day-asc':
      default:
        return this.compareDay(left.dayOfWeek, right.dayOfWeek)
          || this.compareText(left.startTime, right.startTime);
    }
  }

  private compareDay(left: string | null | undefined, right: string | null | undefined): number {
    return this.dayOfWeekOptions.indexOf(left ?? '') - this.dayOfWeekOptions.indexOf(right ?? '');
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private normalizeTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private getTimetableDurationMinutes(entry: TimetableEntry): number {
    const [startHour, startMinute] = this.normalizeTime(entry.startTime).split(':').map(value => Number(value));
    const [endHour, endMinute] = this.normalizeTime(entry.endTime).split(':').map(value => Number(value));

    if ([startHour, startMinute, endHour, endMinute].some(value => Number.isNaN(value))) {
      return 0;
    }

    return ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
  }
}
