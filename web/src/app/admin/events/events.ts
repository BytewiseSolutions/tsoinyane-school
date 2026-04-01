import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { SchoolEvent } from './school-event';

@Component({
  selector: 'app-events',
  standalone: false,
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  private readonly destroy$ = new Subject<void>();
  readonly pageSizeOptions = [10, 25, 50];

  searchTerm = '';
  statusFilter = 'All';
  typeFilter = 'All';
  sortField: 'name' | 'date' | 'eventType' | 'location' | 'status' = 'date';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 10;
  currentPage = 1;
  showForm = false;
  showDeleteDialog = false;
  selectedEvent: SchoolEvent | null = null;
  eventToDelete: SchoolEvent | null = null;
  selectedSchoolId: number | null = null;
  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  actionMessage = '';

  events: SchoolEvent[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit() {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.loadEvents();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredEvents(): SchoolEvent[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.events.filter(event => {
      const eventType = event.eventType?.trim() || 'General';
      const status = event.status?.trim() || '';
      const matchesSearch = !query || [
        event.name,
        event.location,
        eventType,
        status,
        this.normalizeDate(event.date),
      ]
        .filter((value): value is string => Boolean(value))
        .some(value => value.toLowerCase().includes(query));
      const matchesStatus = this.statusFilter === 'All' || status === this.statusFilter;
      const matchesType = this.typeFilter === 'All' || eventType === this.typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  get sortedFilteredEvents(): SchoolEvent[] {
    return [...this.filteredEvents].sort((left, right) => this.compareEvents(left, right));
  }

  get paginatedEvents(): SchoolEvent[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.sortedFilteredEvents.slice(start, start + this.pageSize);
  }

  get eventTypeOptions(): string[] {
    return Array.from(new Set(this.events.map(event => event.eventType?.trim() || 'General')))
      .sort((left, right) => left.localeCompare(right));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.sortedFilteredEvents.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.sortedFilteredEvents.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.sortedFilteredEvents.length);
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim()
      || this.statusFilter !== 'All'
      || this.typeFilter !== 'All'
    );
  }

  openForm(event: SchoolEvent | null = null) {
    if (!event && !this.selectedSchoolId) {
      this.errorMessage = 'Select a school before adding an event.';
      return;
    }

    this.selectedEvent = event ? { ...event } : null;
    this.showForm = true;
    this.errorMessage = '';
  }

  closeForm() {
    this.showForm = false;
    this.selectedEvent = null;
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.typeFilter = 'All';
    this.currentPage = 1;
  }

  onFiltersChanged() {
    this.currentPage = 1;
  }

  onPageSizeChanged() {
    this.currentPage = 1;
  }

  toggleSort(field: 'name' | 'date' | 'eventType' | 'location' | 'status') {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortField = field;
    this.sortDirection = field === 'date' ? 'asc' : 'asc';
  }

  getSortIndicator(field: 'name' | 'date' | 'eventType' | 'location' | 'status'): string {
    if (this.sortField !== field) {
      return '';
    }

    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  goToPreviousPage() {
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage() {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
    }
  }

  onSaved(event: SchoolEvent) {
    const isEdit = !!this.selectedEvent?.id;
    this.errorMessage = '';
    this.closeForm();
    this.loadEvents();
    this.showTemporaryMessage(isEdit ? 'Event updated successfully.' : 'Event created successfully.');
  }

  deleteEvent(event: SchoolEvent) {
    if (!event.id || this.isProcessing) {
      return;
    }

    this.eventToDelete = event;
    this.showDeleteDialog = true;
  }

  cancelDeleteEvent() {
    this.eventToDelete = null;
    this.showDeleteDialog = false;
  }

  confirmDeleteEvent() {
    if (!this.eventToDelete?.id || this.isProcessing) {
      return;
    }

    const targetEvent = this.eventToDelete;
    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`event/${targetEvent.id}`).subscribe({
      next: () => {
        this.events = this.events.filter(item => item.id !== targetEvent.id);
        this.cancelDeleteEvent();
        this.showTemporaryMessage('Event deleted successfully.');
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete event.';
        this.cancelDeleteEvent();
        this.isProcessing = false;
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  private loadEvents() {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<SchoolEvent[]>('event', this.selectedSchoolId ? { schoolId: this.selectedSchoolId } : undefined).subscribe({
      next: (events) => {
        this.events = events ?? [];
        this.currentPage = 1;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load events.';
        this.events = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private normalizeDate(value?: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private showTemporaryMessage(message: string) {
    this.actionMessage = message;
    setTimeout(() => {
      if (this.actionMessage === message) {
        this.actionMessage = '';
      }
    }, 2500);
  }

  private compareEvents(left: SchoolEvent, right: SchoolEvent): number {
    const leftValue = this.getSortValue(left, this.sortField);
    const rightValue = this.getSortValue(right, this.sortField);
    let comparison = 0;

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      comparison = leftValue - rightValue;
    } else {
      comparison = String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true, sensitivity: 'base' });
    }

    return this.sortDirection === 'asc' ? comparison : -comparison;
  }

  private getSortValue(
    event: SchoolEvent,
    field: 'name' | 'date' | 'eventType' | 'location' | 'status'
  ): string | number {
    switch (field) {
      case 'date':
        return this.normalizeDate(event.date) || '';
      case 'eventType':
        return event.eventType?.trim() || 'General';
      case 'location':
        return event.location?.trim() || '';
      case 'status':
        return this.getStatusSortWeight(event.status);
      case 'name':
      default:
        return event.name?.trim() || '';
    }
  }

  private getStatusSortWeight(status?: string | null): number {
    switch ((status ?? '').trim()) {
      case 'Upcoming':
        return 0;
      case 'Past':
        return 1;
      default:
        return 2;
    }
  }
}
