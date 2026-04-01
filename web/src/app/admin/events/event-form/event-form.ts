import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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

  ngOnInit() {
    if (this.existingEvent) {
      this.isEdit = true;
      this.event = { ...this.existingEvent };
      return;
    }

    this.event.schoolId = this.schoolId;
  }

  onSubmit() {
    this.saved.emit(this.event);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
