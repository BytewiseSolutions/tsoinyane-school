import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  formatLessonSession(lesson: Lesson): string {
    const date = this.formatLessonDate(lesson.date || lesson.startTime);
    const startTime = this.formatLessonTime(lesson.startTime);
    const endTime = this.formatLessonTime(lesson.endTime);

    return `${date} ${startTime} - ${endTime}`;
  }

  getAttendanceCompletion(_lesson: Lesson): string {
    return 'P:0% | L:0% | A:0%';
  }

  getHomeworkCompletion(_lesson: Lesson): string {
    return '0%';
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
    };
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
}
