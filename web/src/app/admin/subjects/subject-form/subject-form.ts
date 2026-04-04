import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SchoolSubject } from '../subject';

@Component({
  selector: 'app-subject-form',
  standalone: false,
  templateUrl: './subject-form.html',
  styleUrl: './subject-form.scss',
})
export class SubjectForm implements OnInit {
  @Input() existingSubject: SchoolSubject | null = null;
  @Input() schoolId: number | null = null;
  @Input() schoolName = '';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SchoolSubject>();

  isEdit = false;
  subject: SchoolSubject = {
    code: '',
    name: '',
    schoolId: null,
    schoolName: null,
    gradeId: null,
    gradeName: null,
    teacherId: null,
    teacherName: null,
    status: null,
  };

  ngOnInit() {
    if (this.existingSubject) {
      this.isEdit = true;
      this.subject = {
        ...this.existingSubject,
        gradeId: this.toNumberOrNull(this.existingSubject.gradeId),
      };
      return;
    }

    this.subject.schoolId = this.schoolId;
    this.subject.schoolName = this.schoolName || null;
  }

  onSubmit() {
    const code = this.subject.code.trim();
    const name = this.subject.name.trim();

    if (!code || !name) {
      return;
    }

    this.saved.emit({
      ...this.subject,
      code,
      name,
      schoolId: this.subject.schoolId ?? this.schoolId,
      schoolName: this.subject.schoolName ?? (this.schoolName || null),
    });
    this.close();
  }

  close() {
    this.closed.emit();
  }

  private toNumberOrNull(value: number | string | null | undefined): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
}
