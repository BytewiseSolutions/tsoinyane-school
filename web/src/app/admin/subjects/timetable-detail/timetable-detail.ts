import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { BackendService } from '../../../util/backend.service';
import { Lesson } from '../lesson';
import { StudentLesson } from '../student-lesson';
import { TimetableEntry } from '../timetable-entry';
import { StudentOption } from '../student-option';
import { AttendanceStatus } from '../attendance-status';
import { HomeworkStatus } from '../homework-status';
import { LessonStatus } from '../lesson-status';

const SELECT_ALL_ID = -1;

@Component({
  selector: 'app-timetable-detail',
  standalone: false,
  templateUrl: './timetable-detail.html',
  styleUrl: './timetable-detail.scss',
})
export class TimetableDetail implements OnInit {
  readonly pageSizeOptions = [10, 25, 50];
  readonly LessonStatus = LessonStatus;
  timetable: TimetableEntry | null = null;
  assignedStudents: StudentOption[] = [];
  lessons: Lesson[] = [];
  studentLessons: StudentLesson[] = [];
  availableStudentsForLesson: StudentOption[] = [];
  selectableStudentsForLesson: StudentOption[] = [];
  isLoading = true;
  isLoadingLessons = false;
  isLoadingStudentLessons = false;
  removingStudentLessonId: number | null = null;
  pendingRemovalStudent: (StudentOption & {
    studentLessonId: number | null;
    attendanceStatus?: AttendanceStatus | null;
    homeworkStatus?: HomeworkStatus | null;
  }) | null = null;
  errorMessage = '';
  lessonsError = '';
  studentsError = '';
  subjectId: number | null = null;
  timetableId: number | null = null;
  activeTab: 'lessons' | 'students' = 'lessons';
  selectedLessonId: number | null = null;
  showStudentForm = false;
  isSavingStudentLesson = false;
  selectedStudentOption: StudentOption | null = null;
  selectedStudentOptions: StudentOption[] = [];
  lessonSearchTerm = '';
  selectedLessonStatusFilter: LessonStatus | 'ALL' = 'ALL';
  selectedLessonSort = 'date-asc';
  lessonPageSize = 10;
  lessonCurrentPage = 1;
  studentLessonForm: StudentLesson = {
    lessonId: null,
    studentId: null,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('id'));
    const timetableId = Number(this.route.snapshot.paramMap.get('timetableId'));

    if (!Number.isFinite(subjectId) || subjectId <= 0 || !Number.isFinite(timetableId) || timetableId <= 0) {
      this.errorMessage = 'Timetable not found.';
      this.isLoading = false;
      return;
    }

    this.subjectId = subjectId;
    this.timetableId = timetableId;

    this.backendService.get<TimetableEntry>(`timetable/${timetableId}`).subscribe({
      next: (timetable) => {
        this.timetable = this.mapTimetable(timetable);
        this.loadAssignedStudents(subjectId);
        this.loadLessons(timetableId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load timetable details.';
        this.isLoading = false;
      },
    });
  }

  goBack(): void {
    if (this.subjectId) {
      this.router.navigate(['/admin/subjects', this.subjectId]);
      return;
    }

    this.router.navigate(['/admin/subjects']);
  }

  viewLesson(lessonId: number | null | undefined): void {
    if (!this.subjectId || !this.timetableId || !lessonId) {
      return;
    }

    this.router.navigate(['/admin/subjects', this.subjectId, 'timetable', this.timetableId, 'lessons', lessonId]);
  }

  getDayLabel(dayOfWeek: string | null | undefined): string {
    return (dayOfWeek ?? '')
      .toLowerCase()
      .replace(/^\w/, value => value.toUpperCase());
  }

  formatTimeRange(): string {
    if (!this.timetable) {
      return 'N/A';
    }

    return `${this.timetable.startTime} - ${this.timetable.endTime}`;
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

  formatLessonSession(lesson: Lesson): string {
    const date = this.formatLessonDate(lesson.date || lesson.startTime);
    const startTime = this.formatLessonTime(lesson.startTime);
    const endTime = this.formatLessonTime(lesson.endTime);

    return `${date} ${startTime} - ${endTime}`;
  }

  get filteredLessons(): Lesson[] {
    const query = this.lessonSearchTerm.trim().toLowerCase();

    return [...this.lessons]
      .filter(lesson => this.matchesLessonSearch(lesson, query))
      .filter(lesson => this.selectedLessonStatusFilter === 'ALL' || lesson.status === this.selectedLessonStatusFilter)
      .sort((left, right) => this.compareLessons(left, right));
  }

  get paginatedLessons(): Lesson[] {
    const start = (this.safeLessonCurrentPage - 1) * this.lessonPageSize;
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

  get safeLessonCurrentPage(): number {
    return Math.min(this.lessonCurrentPage, this.lessonTotalPages);
  }

  get lessonPageStart(): number {
    if (!this.filteredLessons.length) {
      return 0;
    }

    return (this.safeLessonCurrentPage - 1) * this.lessonPageSize + 1;
  }

  get lessonPageEnd(): number {
    return Math.min(this.safeLessonCurrentPage * this.lessonPageSize, this.filteredLessons.length);
  }

  getAttendanceCompletion(_lesson: Lesson): string {
    const total = _lesson.studentCount ?? 0;
    if (!total) {
      return 'N/A';
    }

    const present = this.toPercent(_lesson.attendancePresentCount, total);
    const late = this.toPercent(_lesson.attendanceLateCount, total);
    const absent = this.toPercent(_lesson.attendanceAbsentCount, total);
    const pending = this.toPercent(_lesson.attendancePendingCount, total);
    const summary = [`P:${present}%`, `L:${late}%`, `A:${absent}%`];

    if ((_lesson.attendancePendingCount ?? 0) > 0) {
      summary.push(`Pending:${pending}%`);
    }

    return summary.join(' | ');
  }

  getHomeworkCompletion(_lesson: Lesson): string {
    const total = _lesson.studentCount ?? 0;
    if (!total) {
      return 'N/A';
    }

    return `${this.toPercent(_lesson.homeworkDoneCount, total)}%`;
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

  get timetableStudents(): StudentOption[] {
    if (!this.timetable?.studentIds?.length) {
      return [];
    }

    const ids = new Set(this.timetable.studentIds);
    return this.assignedStudents.filter(student => ids.has(student.id));
  }

  get selectedLesson(): Lesson | null {
    return this.lessons.find(lesson => lesson.id === this.selectedLessonId) ?? null;
  }

  get studentRows(): Array<StudentOption & {
    studentLessonId: number | null;
    attendanceStatus?: AttendanceStatus | null;
    homeworkStatus?: HomeworkStatus | null;
  }> {
    return this.studentLessons.map(studentLesson => {
      const student = this.assignedStudents.find(item => item.id === studentLesson.studentId);

      return {
        studentLessonId: studentLesson.id ?? null,
        id: studentLesson.studentId ?? 0,
        displayName: studentLesson.studentName || student?.displayName || 'Unknown',
        studentId: studentLesson.studentNumber ?? student?.studentId ?? null,
        email: student?.email ?? null,
        phone: student?.phone ?? null,
        attendanceStatus: studentLesson.attendanceStatus ?? null,
        homeworkStatus: studentLesson.homeworkStatus ?? null,
      };
    });
  }

  onStudentAdded(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudentOptions = [...this.availableStudentsForLesson];
    }
  }

  onStudentRemoved(item: StudentOption) {
    if (item.id === SELECT_ALL_ID) {
      this.selectedStudentOptions = [];
    } else {
      this.selectedStudentOptions = this.selectedStudentOptions.filter(s => s.id !== SELECT_ALL_ID);
    }
  }

  selectLesson(lessonId: number | null): void {
    this.selectedLessonId = lessonId;
    this.loadStudentLessons();
  }

  onLessonFiltersChanged(): void {
    this.lessonCurrentPage = 1;
  }

  onLessonPageSizeChanged(): void {
    this.lessonCurrentPage = 1;
  }

  goToPreviousLessonPage(): void {
    if (this.safeLessonCurrentPage > 1) {
      this.lessonCurrentPage = this.safeLessonCurrentPage - 1;
    }
  }

  goToNextLessonPage(): void {
    if (this.safeLessonCurrentPage < this.lessonTotalPages) {
      this.lessonCurrentPage = this.safeLessonCurrentPage + 1;
    }
  }

  exportLessons(): void {
    if (!this.filteredLessons.length) {
      this.lessonsError = 'No lessons available to export for the current filters.';
      return;
    }

    const rows = this.filteredLessons.map(lesson => ({
      Session: this.formatLessonSession(lesson),
      Students: lesson.studentCount ?? 0,
      Attendance: this.getAttendanceCompletion(lesson),
      'Homework % Complete': this.getHomeworkCompletion(lesson),
      Status: lesson.status || 'PENDING',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lessons');
    XLSX.writeFile(
      workbook,
      `lessons_${(this.timetable?.subjectName || 'timetable').replace(/\s+/g, '_')}_${(this.timetable?.dayOfWeek || 'schedule').toLowerCase()}.xlsx`
    );
    this.lessonsError = '';
  }

  openStudentForm(): void {
    if (!this.selectedLessonId) {
      this.studentsError = 'Select a lesson first.';
      return;
    }

    this.studentsError = '';
    this.selectedStudentOption = null;
    this.selectedStudentOptions = [];
    this.studentLessonForm = {
      lessonId: this.selectedLessonId,
      studentId: null,
    };
    this.showStudentForm = true;
  }

  closeStudentForm(): void {
    this.showStudentForm = false;
    this.selectedStudentOption = null;
    this.selectedStudentOptions = [];
    this.studentLessonForm = {
      lessonId: this.selectedLessonId,
      studentId: null,
    };
  }

  saveStudentLesson(): void {
    if (!this.selectedLessonId || !this.selectedStudentOptions.length || this.isSavingStudentLesson) {
      this.studentsError = 'Select at least one student to add.';
      return;
    }

    this.isSavingStudentLesson = true;
    this.studentsError = '';

    const requests = this.selectedStudentOptions
      .filter(student => student.id !== SELECT_ALL_ID)
      .map(student => ({
      lessonId: this.selectedLessonId,
      studentId: student.id,
      attendanceStatus: AttendanceStatus.PENDING,
      homeworkStatus: HomeworkStatus.PENDING,
    } as StudentLesson));

    let completed = 0;
    const results: StudentLesson[] = [];

    requests.forEach(payload => {
      this.backendService.post<StudentLesson, StudentLesson>('student-lesson', payload).subscribe({
        next: (studentLesson) => {
          results.push(studentLesson);
        },
        error: (error: HttpErrorResponse) => {
          this.studentsError = error.error?.message || 'Failed to add student to lesson.';
        },
        complete: () => {
          completed++;
          if (completed === requests.length) {
            this.studentLessons = [...this.studentLessons, ...results];
            this.syncSelectedLessonStats();
            this.selectedStudentOptions = [];
            this.isSavingStudentLesson = false;
          }
        },
      });
    });
  }

  confirmRemoveStudentLesson(student: StudentOption & {
    studentLessonId: number | null;
    attendanceStatus?: AttendanceStatus | null;
    homeworkStatus?: HomeworkStatus | null;
  }): void {
    this.pendingRemovalStudent = student;
  }

  cancelRemoveStudentLesson(): void {
    if (this.removingStudentLessonId) {
      return;
    }

    this.pendingRemovalStudent = null;
  }

  removeStudentLesson(studentLessonId: number | null): void {
    if (!studentLessonId || this.removingStudentLessonId === studentLessonId) {
      return;
    }

    this.removingStudentLessonId = studentLessonId;
    this.studentsError = '';

    this.backendService.delete<void>(`student-lesson/${studentLessonId}`).subscribe({
      next: () => {
        this.studentLessons = this.studentLessons.filter(item => item.id !== studentLessonId);
        this.syncSelectedLessonStats();
        this.refreshSelectableStudentsForLesson();
      },
      error: (error: HttpErrorResponse) => {
        this.studentsError = error.error?.message || 'Failed to remove student from lesson.';
      },
      complete: () => {
        this.removingStudentLessonId = null;
        this.pendingRemovalStudent = null;
      },
    });
  }

  private loadAssignedStudents(subjectId: number): void {
    this.backendService.get<any[]>(`subject/${subjectId}/students`).subscribe({
      next: (students) => {
        this.assignedStudents = (students ?? []).map(student => ({
          id: student.id,
          displayName: student.userFullName,
          email: student.userEmail ?? null,
          phone: student.userPhone ?? null,
          studentId: student.studentNumber ?? null,
        }));
        this.refreshSelectableStudentsForLesson();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load timetable students.';
      },
      complete: () => {
        if (!this.isLoadingLessons && !this.isLoadingStudentLessons) {
          this.isLoading = false;
        }
      },
    });
  }

  private loadLessons(timetableId: number): void {
    this.isLoadingLessons = true;
    this.lessonsError = '';

    this.backendService.get<Lesson[]>('lesson', { timetableId }).subscribe({
      next: (lessons) => {
        this.lessons = (lessons ?? []).map(lesson => this.mapLesson(lesson));
        this.lessonCurrentPage = 1;
        this.selectedLessonId = this.lessons[0]?.id ?? null;
        this.loadStudentLessons();
      },
      error: (error: HttpErrorResponse) => {
        this.lessonsError = error.error?.message || 'Failed to load lessons.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoadingLessons = false;
        if (!this.isLoadingStudentLessons) {
          this.isLoading = false;
        }
      },
    });
  }

  private loadStudentLessons(): void {
    if (!this.selectedLessonId) {
      this.studentLessons = [];
      this.isLoadingStudentLessons = false;
      if (!this.isLoadingLessons) {
        this.isLoading = false;
      }
      return;
    }

    this.isLoadingStudentLessons = true;
    this.studentsError = '';

    this.backendService.get<StudentLesson[]>('student-lesson', { lessonId: this.selectedLessonId }).subscribe({
      next: (studentLessons) => {
        this.studentLessons = studentLessons ?? [];
        this.syncSelectedLessonStats();
        this.refreshSelectableStudentsForLesson();
      },
      error: (error: HttpErrorResponse) => {
        this.studentsError = error.error?.message || 'Failed to load lesson students.';
      },
      complete: () => {
        this.isLoadingStudentLessons = false;
        this.isLoading = false;
      },
    });
  }

  private mapTimetable(entry: TimetableEntry): TimetableEntry {
    return {
      ...entry,
      startTime: this.normalizeTime(entry.startTime),
      endTime: this.normalizeTime(entry.endTime),
      studentIds: entry.studentIds ?? [],
    };
  }

  private mapLesson(lesson: Lesson): Lesson {
    return {
      ...lesson,
      date: lesson.date ?? null,
      startTime: lesson.startTime ?? null,
      endTime: lesson.endTime ?? null,
      studentCount: lesson.studentCount ?? 0,
      attendancePresentCount: lesson.attendancePresentCount ?? 0,
      attendanceLateCount: lesson.attendanceLateCount ?? 0,
      attendanceAbsentCount: lesson.attendanceAbsentCount ?? 0,
      attendancePendingCount: lesson.attendancePendingCount ?? 0,
      homeworkDoneCount: lesson.homeworkDoneCount ?? 0,
      homeworkNotDoneCount: lesson.homeworkNotDoneCount ?? 0,
      homeworkNoneCount: lesson.homeworkNoneCount ?? 0,
      homeworkPendingCount: lesson.homeworkPendingCount ?? 0,
    };
  }

  private matchesLessonSearch(lesson: Lesson, query: string): boolean {
    if (!query) {
      return true;
    }

    return this.formatLessonSession(lesson).toLowerCase().includes(query)
      || (lesson.status || 'PENDING').toLowerCase().includes(query)
      || String(lesson.studentCount ?? 0).includes(query);
  }

  private compareLessons(left: Lesson, right: Lesson): number {
    switch (this.selectedLessonSort) {
      case 'date-desc':
        return this.compareLessonDate(right, left);
      case 'status-asc':
        return (left.status || 'PENDING').localeCompare(right.status || 'PENDING');
      case 'status-desc':
        return (right.status || 'PENDING').localeCompare(left.status || 'PENDING');
      case 'students-desc':
        return (right.studentCount ?? 0) - (left.studentCount ?? 0);
      case 'students-asc':
        return (left.studentCount ?? 0) - (right.studentCount ?? 0);
      case 'homework-desc':
        return this.getHomeworkPercent(right) - this.getHomeworkPercent(left);
      case 'homework-asc':
        return this.getHomeworkPercent(left) - this.getHomeworkPercent(right);
      case 'date-asc':
      default:
        return this.compareLessonDate(left, right);
    }
  }

  private compareLessonDate(left: Lesson, right: Lesson): number {
    return (left.date || left.startTime || '').localeCompare(right.date || right.startTime || '');
  }

  private normalizeTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private refreshSelectableStudentsForLesson(): void {
    const usedStudentIds = new Set(this.studentLessons.map(item => item.studentId).filter((id): id is number => !!id));
    this.availableStudentsForLesson = this.timetableStudents.filter(student => !usedStudentIds.has(student.id));
    this.selectableStudentsForLesson = this.availableStudentsForLesson.length
      ? [
          { id: SELECT_ALL_ID, displayName: 'Select All', email: null, phone: null, studentId: null },
          ...this.availableStudentsForLesson,
        ]
      : [];

    this.selectedStudentOptions = this.selectedStudentOptions.filter(selected =>
      selected.id === SELECT_ALL_ID || this.availableStudentsForLesson.some(student => student.id === selected.id)
    );
  }

  private syncSelectedLessonStats(): void {
    if (!this.selectedLessonId) {
      return;
    }

    const stats = this.calculateLessonStats(this.studentLessons);
    this.lessons = this.lessons.map(lesson =>
      lesson.id === this.selectedLessonId
        ? {
            ...lesson,
            ...stats,
          }
        : lesson
    );
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

  private toPercent(value: number | null | undefined, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round(((value ?? 0) / total) * 100);
  }

  private getHomeworkPercent(lesson: Lesson): number {
    const total = lesson.studentCount ?? 0;
    if (!total) {
      return 0;
    }

    return this.toPercent(lesson.homeworkDoneCount, total);
  }
}
