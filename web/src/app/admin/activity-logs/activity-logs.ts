import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { ActivityLog } from './activity-log';

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

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.loadLogs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredLogs(): ActivityLog[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.logs.filter(log => {
      const matchesSearch = !query || [
        log.actorName,
        log.actorEmail,
        log.description,
        log.module,
        log.action,
        log.schoolName,
        log.endpoint,
      ]
        .filter((value): value is string => Boolean(value))
        .some(value => value.toLowerCase().includes(query));
      const matchesAction = this.actionFilter === 'All' || log.action === this.actionFilter;
      const matchesModule = this.moduleFilter === 'All' || log.module === this.moduleFilter;
      const matchesOutcome = this.outcomeFilter === 'All'
        || (this.outcomeFilter === 'Successful' && log.success)
        || (this.outcomeFilter === 'Failed' && !log.success);

      return matchesSearch && matchesAction && matchesModule && matchesOutcome;
    });
  }

  get paginatedLogs(): ActivityLog[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  get actionOptions(): string[] {
    return Array.from(new Set(this.logs.map(log => log.action))).sort((left, right) => left.localeCompare(right));
  }

  get moduleOptions(): string[] {
    return Array.from(new Set(this.logs.map(log => log.module))).sort((left, right) => left.localeCompare(right));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.filteredLogs.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.filteredLogs.length);
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
  }

  onPageSizeChanged(): void {
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.actionFilter = 'All';
    this.moduleFilter = 'All';
    this.outcomeFilter = 'All';
    this.currentPage = 1;
  }

  goToPreviousPage(): void {
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage(): void {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
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

    this.backendService.get<ActivityLog[]>('activity-log', this.selectedSchoolId ? { schoolId: this.selectedSchoolId } : undefined).subscribe({
      next: (logs) => {
        this.logs = logs ?? [];
        this.currentPage = 1;
      },
      error: (error: HttpErrorResponse) => {
        this.logs = [];
        this.errorMessage = error.error?.message || 'Failed to load activity logs.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}
