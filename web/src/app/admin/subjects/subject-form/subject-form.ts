import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface SchoolSubject {
  name: string;
  school: string;
  teacher: string;
  students: number;
  status: string;
}

@Component({
  selector: 'app-subject-form',
  standalone: false,
  templateUrl: './subject-form.html',
  styleUrl: './subject-form.scss',
})
export class SubjectForm implements OnInit {
  @Input() existingSubject: SchoolSubject | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SchoolSubject>();

  isEdit = false;

  subject: SchoolSubject = {
    name: '',
    school: '',
    teacher: '',
    students: 0,
    status: 'Active',
  };

  ngOnInit() {
    if (this.existingSubject) {
      this.isEdit = true;
      this.subject = { ...this.existingSubject };
    }
  }

  onSubmit() {
    this.saved.emit(this.subject);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
