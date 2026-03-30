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

  showForm = false;
  selectedEvent: SchoolEvent | null = null;
  selectedSchoolId: number | null = null;
  isLoading = false;
  errorMessage = '';

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

  onSaved(event: SchoolEvent) {
    const payload: SchoolEvent = {
      ...event,
      schoolId: event.schoolId ?? this.selectedSchoolId,
    };

    const request$ = payload.id
      ? this.backendService.put<SchoolEvent, SchoolEvent>(`event/${payload.id}`, payload)
      : this.backendService.post<SchoolEvent, SchoolEvent>('event', payload);

    request$.subscribe({
      next: () => {
        this.closeForm();
        this.loadEvents();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to save event.';
      },
    });
  }

  deleteEvent(event: SchoolEvent) {
    if (!event.id) {
      return;
    }

    this.backendService.delete<void>(`event/${event.id}`).subscribe({
      next: () => {
        this.events = this.events.filter(item => item.id !== event.id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete event.';
      },
    });
  }

  private loadEvents() {
    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<SchoolEvent[]>('event', this.selectedSchoolId ? { schoolId: this.selectedSchoolId } : undefined).subscribe({
      next: (events) => {
        this.events = events ?? [];
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
}
