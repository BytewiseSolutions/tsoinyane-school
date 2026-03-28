import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface Teacher {
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  subject: string;
  school: string;
  status: string;
}

@Component({
  selector: 'app-teacher-form',
  standalone: false,
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.scss',
})
export class TeacherForm implements OnInit {
  @Input() existingTeacher: Teacher | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Teacher>();

  isEdit = false;

  teacher: Teacher = {
    firstName: '',
    lastName: '',
    gender: '',
    phone: '',
    subject: '',
    school: '',
    status: 'Active',
  };

  ngOnInit() {
    if (this.existingTeacher) {
      this.isEdit = true;
      this.teacher = { ...this.existingTeacher };
    }
  }

  onSubmit() {
    this.saved.emit(this.teacher);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
