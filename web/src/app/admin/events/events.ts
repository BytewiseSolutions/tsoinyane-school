import { Component } from '@angular/core';
import { SchoolEvent } from './event-form/event-form';

@Component({
  selector: 'app-events',
  standalone: false,
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class Events {
  showForm = false;
  selectedEvent: SchoolEvent | null = null;

  events: SchoolEvent[] = [
    { name: 'Term 1 Begins', date: '2026-01-20', location: 'School Grounds', status: 'Upcoming' },
    { name: 'Sports Day', date: '2026-03-15', location: 'Sports Field', status: 'Upcoming' },
    { name: 'Parent Meeting', date: '2026-04-05', location: 'School Hall', status: 'Upcoming' },
    { name: 'Mid-Year Exams', date: '2026-06-10', location: 'Classrooms', status: 'Past' },
  ];

  openForm(event: SchoolEvent | null = null) {
    this.selectedEvent = event;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.selectedEvent = null;
  }

  onSaved(event: SchoolEvent) {
    if (this.selectedEvent) {
      const index = this.events.indexOf(this.selectedEvent);
      if (index > -1) this.events[index] = event;
    } else {
      this.events.push(event);
    }
    this.closeForm();
  }

  deleteEvent(event: SchoolEvent) {
    this.events = this.events.filter(e => e !== event);
  }
}
