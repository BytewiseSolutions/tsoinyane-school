import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { ActivityLog } from './activity-log';
import { ActivityLogPage } from './activity-log-page';

@Component({
  selector: 'app-activity-logs',
  standalone: false,
  templateUrl: './activity-logs.html',
  styleUrl: './activity-logs.scss',
})
export class ActivityLogs implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  readonly pageSizeOptions = [10, 25, 50];

  searchTerm = '';
  actionFilter = 'All';
  moduleFilter = 'All';
  outcomeFilter = 'All';
  pageSize = 10;
  currentPage = 1;
  selectedSchoolId: number | null = null;
  isLoading = false;
  errorMessage = '';

  logs: ActivityLog[] = [];
  availableActions: string[] = [];
  availableModules: string[] = [];
  totalLogs = 0;
  totalPages = 1;

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.currentPage = 1;
        this.loadLogs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get actionOptions(): string[] {
    return this.availableActions;
  }

  get moduleOptions(): string[] {
    return this.availableModules;
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.logs.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.totalLogs);
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim()
      || this.actionFilter !== 'All'
      || this.moduleFilter !== 'All'
      || this.outcomeFilter !== 'All'
    );
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.actionFilter = 'All';
    this.moduleFilter = 'All';
    this.outcomeFilter = 'All';
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
      this.loadLogs();
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
      this.loadLogs();
    }
  }

  getActorLabel(log: ActivityLog): string {
    return log.actorName?.trim() || log.actorEmail?.trim() || 'Anonymous';
  }

  getOutcomeLabel(log: ActivityLog): 'Successful' | 'Failed' {
    return log.success ? 'Successful' : 'Failed';
  }

  formatAction(action: string): string {
    return action
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private loadLogs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: Record<string, string | number | boolean> = {
      page: this.currentPage,
      pageSize: this.pageSize,
    };

    const query = this.searchTerm.trim();
    if (query) {
      params['query'] = query;
    }
    if (this.actionFilter !== 'All') {
      params['action'] = this.actionFilter;
    }
    if (this.moduleFilter !== 'All') {
      params['module'] = this.moduleFilter;
    }
    if (this.outcomeFilter === 'Successful') {
      params['success'] = true;
    } else if (this.outcomeFilter === 'Failed') {
      params['success'] = false;
    }
    if (this.selectedSchoolId != null) {
      params['schoolId'] = this.selectedSchoolId;
    }

    this.backendService.get<ActivityLogPage>('activity-log', params).subscribe({
      next: (response) => {
        this.logs = response?.logs ?? [];
        this.availableActions = response?.actionOptions ?? [];
        this.availableModules = response?.moduleOptions ?? [];
        this.totalLogs = response?.totalLogs ?? 0;
        this.totalPages = Math.max(1, response?.totalPages ?? 1);
        this.currentPage = Math.min(response?.currentPage ?? this.currentPage, this.totalPages);
        this.pageSize = response?.pageSize ?? this.pageSize;
      },
      error: (error: HttpErrorResponse) => {
        this.logs = [];
        this.availableActions = [];
        this.availableModules = [];
        this.totalLogs = 0;
        this.totalPages = 1;
        this.errorMessage = error.error?.message || 'Failed to load activity logs.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
