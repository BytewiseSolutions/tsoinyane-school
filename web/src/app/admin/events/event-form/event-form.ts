import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface SchoolEvent {
  name: string;
  date: string;
  location: string;
  status: string;
}

@Component({
  selector: 'app-event-form',
  standalone: false,
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm implements OnInit {
  @Input() existingEvent: SchoolEvent | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SchoolEvent>();

  isEdit = false;

  event: SchoolEvent = {
    name: '',
    date: '',
    location: '',
    status: 'Upcoming',
  };

  ngOnInit() {
    if (this.existingEvent) {
      this.isEdit = true;
      this.event = { ...this.existingEvent };
    }
  }

  onSubmit() {
    this.saved.emit(this.event);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
