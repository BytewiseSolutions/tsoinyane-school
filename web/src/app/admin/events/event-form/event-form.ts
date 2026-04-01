import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { SchoolEvent } from '../school-event';

@Component({
  selector: 'app-event-form',
  standalone: false,
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm implements OnInit {
  @Input() existingEvent: SchoolEvent | null = null;
  @Input() schoolId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SchoolEvent>();

  isSubmitting = false;
  errorMessage = '';
  isEdit = false;

  event: SchoolEvent = {
    schoolId: null,
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    eventType: 'Academic',
    description: '',
    status: 'Upcoming',
  };

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit() {
    if (this.existingEvent) {
      this.isEdit = true;
      this.event = {
        ...this.existingEvent,
        schoolId: this.existingEvent.schoolId ?? this.schoolId ?? this.schoolContext.selectedSchool?.id ?? null,
      };
      return;
    }

    this.event.schoolId = this.schoolId ?? this.schoolContext.selectedSchool?.id ?? null;
  }

  onSubmit() {
    this.errorMessage = '';

    const name = this.event.name.trim();
    const location = this.event.location.trim();
    const schoolId = this.event.schoolId ?? this.schoolId ?? this.schoolContext.selectedSchool?.id ?? null;

    if (!name) {
      this.errorMessage = 'Event name is required.';
      return;
    }

    if (!this.event.date) {
      this.errorMessage = 'Event date is required.';
      return;
    }

    if (!location) {
      this.errorMessage = 'Event location is required.';
      return;
    }

    if (!schoolId) {
      this.errorMessage = 'Please select a school from the top header first.';
      return;
    }

    this.isSubmitting = true;

    const payload: SchoolEvent = {
      ...this.event,
      id: this.isEdit ? this.event.id : undefined,
      name,
      location,
      schoolId,
      status: this.computedStatus,
    };

    const request$ = this.isEdit && this.event.id
      ? this.backendService.put<SchoolEvent, SchoolEvent>(`event/${this.event.id}`, payload)
      : this.backendService.post<SchoolEvent, SchoolEvent>('event', payload);

    request$.subscribe({
      next: (savedEvent) => {
        this.saved.emit(savedEvent);
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || (this.isEdit ? 'Failed to update event.' : 'Failed to create event.');
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  close() {
    this.closed.emit();
  }

  get computedStatus(): string {
    if (!this.event.date) {
      return 'Upcoming';
    }

    const today = this.toDateInputValue(new Date());
    return this.event.date < today ? 'Past' : 'Upcoming';
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
