import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../school-context';
import { BackendService } from '../../../util/backend.service';
import { DashboardRecentStudent, DashboardStats } from './dashboard-stats';
import { SchoolEvent } from '../../events/school-event';

@Component({
  selector: 'app-main',
  standalone: false,
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class AdminMain implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolName = 'All Schools';
  totalStudents = 0;
  totalTeachers = 0;
  totalGrades = 0;
  totalSubjects = 0;
  recentStudents: DashboardRecentStudent[] = [];
  upcomingEvents: SchoolEvent[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private schoolContext: SchoolContextService,
    private backendService: BackendService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolName = school?.name ?? 'All Schools';
        this.loadDashboardStats(school?.id ?? null);
        this.loadUpcomingEvents(school?.id ?? null);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardStats(schoolId: number | null): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<DashboardStats>('dashboard', schoolId ? { schoolId } : undefined).subscribe({
      next: (response) => {
        this.totalStudents = response.totalStudents ?? 0;
        this.totalTeachers = response.totalTeachers ?? 0;
        this.totalGrades = response.totalGrades ?? 0;
        this.totalSubjects = response.totalSubjects ?? 0;
        this.recentStudents = response.recentStudents ?? [];
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load dashboard statistics.';
        this.totalStudents = 0;
        this.totalTeachers = 0;
        this.totalGrades = 0;
        this.recentStudents = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private loadUpcomingEvents(schoolId: number | null): void {
    this.backendService.get<SchoolEvent[]>('event', {
      ...(schoolId ? { schoolId } : {}),
      upcoming: true,
    }).subscribe({
      next: (events) => {
        this.upcomingEvents = events ?? [];
      },
      error: () => {
        this.upcomingEvents = [];
      },
    });
  }
}
