import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

export interface Student {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  school: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  status: string;
}

@Component({
  selector: 'app-student-form',
  standalone: false,
  templateUrl: './student-form.html',
  styleUrl: './student-form.scss',
})
export class StudentForm implements OnInit {
  @Input() existingStudent: Student | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Student>();

  isEdit = false;

  student: Student = {
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    school: '',
    grade: '',
    guardian: '',
    guardianPhone: '',
    status: 'Active',
  };

  ngOnInit() {
    if (this.existingStudent) {
      this.isEdit = true;
      this.student = { ...this.existingStudent };
    }
  }

  onSubmit() {
    this.saved.emit(this.student);
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
