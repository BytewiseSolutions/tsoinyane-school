import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { Lesson } from '../lesson';
import { StudentLesson } from '../student-lesson';

@Component({
  selector: 'app-lesson-detail',
  standalone: false,
  templateUrl: './lesson-detail.html',
  styleUrl: './lesson-detail.scss',
})
export class LessonDetail implements OnInit {
  subjectId: number | null = null;
  timetableId: number | null = null;
  lessonId: number | null = null;
  lesson: Lesson | null = null;
  studentLessons: StudentLesson[] = [];
  isLoading = true;
  studentsLoading = false;
  errorMessage = '';
  studentsError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    const subjectId = Number(this.route.snapshot.paramMap.get('id'));
    const timetableId = Number(this.route.snapshot.paramMap.get('timetableId'));
    const lessonId = Number(this.route.snapshot.paramMap.get('lessonId'));

    if (!Number.isFinite(subjectId) || subjectId <= 0 || !Number.isFinite(timetableId) || timetableId <= 0 || !Number.isFinite(lessonId) || lessonId <= 0) {
      this.errorMessage = 'Lesson not found.';
      this.isLoading = false;
      return;
    }

    this.subjectId = subjectId;
    this.timetableId = timetableId;
    this.lessonId = lessonId;

    this.backendService.get<Lesson>(`lesson/${lessonId}`).subscribe({
      next: (lesson) => {
        this.lesson = lesson;
        this.loadStudentLessons(lessonId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load lesson details.';
        this.isLoading = false;
      },
    });
  }

  goBack(): void {
    if (this.subjectId && this.timetableId) {
      this.router.navigate(['/admin/subjects', this.subjectId, 'timetable', this.timetableId]);
      return;
    }

    if (this.subjectId) {
      this.router.navigate(['/admin/subjects', this.subjectId]);
      return;
    }

    this.router.navigate(['/admin/subjects']);
  }

  formatLessonDate(value: string | null | undefined): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
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

  private loadStudentLessons(lessonId: number): void {
    this.studentsLoading = true;
    this.studentsError = '';

    this.backendService.get<StudentLesson[]>('student-lesson', { lessonId }).subscribe({
      next: (studentLessons) => {
        this.studentLessons = studentLessons ?? [];
      },
      error: (error: HttpErrorResponse) => {
        this.studentsError = error.error?.message || 'Failed to load lesson students.';
      },
      complete: () => {
        this.studentsLoading = false;
        this.isLoading = false;
      },
    });
  }
}
