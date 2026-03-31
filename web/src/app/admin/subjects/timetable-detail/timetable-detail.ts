import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { TimetableEntry } from '../timetable-entry';

interface StudentOption {
  id: number;
  displayName: string;
  email: string | null;
  phone: string | null;
  studentId: string | null;
}

@Component({
  selector: 'app-timetable-detail',
  standalone: false,
  templateUrl: './timetable-detail.html',
  styleUrl: './timetable-detail.scss',
})
export class TimetableDetail implements OnInit {
  timetable: TimetableEntry | null = null;
  assignedStudents: StudentOption[] = [];
  isLoading = true;
  errorMessage = '';
  subjectId: number | null = null;
  activeTab: 'lessons' | 'students' = 'students';

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

    this.backendService.get<TimetableEntry>(`timetable/${timetableId}`).subscribe({
      next: (timetable) => {
        this.timetable = this.mapTimetable(timetable);
        this.loadAssignedStudents(subjectId);
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

  get timetableStudents(): StudentOption[] {
    if (!this.timetable?.studentIds?.length) {
      return [];
    }

    const ids = new Set(this.timetable.studentIds);
    return this.assignedStudents.filter(student => ids.has(student.id));
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
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load timetable students.';
      },
      complete: () => {
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

  private normalizeTime(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length >= 5 ? value.slice(0, 5) : value;
  }
}
