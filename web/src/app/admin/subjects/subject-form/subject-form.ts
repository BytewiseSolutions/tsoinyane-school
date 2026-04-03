import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Grade } from '../../grades/grade';
import { Status } from '../../users/status';
import { SchoolSubject } from '../subject';
import { SubjectTeacherOption } from '../subject-teacher-option';

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
  @Input() gradeOptions: Grade[] = [];
  @Input() teacherOptions: SubjectTeacherOption[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<SchoolSubject>();

  isEdit = false;
  readonly statusOptions = [Status.ACTIVE, Status.INACTIVE];

  subject: SchoolSubject = {
    code: '',
    name: '',
    schoolId: null,
    schoolName: null,
    gradeId: null,
    gradeName: null,
    teacherId: null,
    teacherName: null,
    status: Status.ACTIVE,
  };

  get availableTeachers(): SubjectTeacherOption[] {
    if (!this.subject.gradeId) {
      return [];
    }
    
    return this.teacherOptions.filter(teacher => 
      teacher.gradeIds && teacher.gradeIds.includes(this.subject.gradeId!)
    );
  }

  onGradeChange() {
    // Reset teacher selection when grade changes
    this.subject.teacherId = null;
  }

  ngOnInit() {
    if (this.existingSubject) {
      this.isEdit = true;
      this.subject = { ...this.existingSubject };
      return;
    }

    this.subject.schoolId = this.schoolId;
    this.subject.schoolName = this.schoolName || null;
  }

  onSubmit() {
    const code = this.subject.code.trim();
    const name = this.subject.name.trim();

    if (!code || !name || !this.subject.gradeId || !this.subject.teacherId) {
      return;
    }

    const selectedGrade = this.gradeOptions.find(grade => grade.id === this.subject.gradeId);
    const selectedTeacher = this.availableTeachers.find(teacher => teacher.id === this.subject.teacherId);

    this.saved.emit({
      ...this.subject,
      code,
      name,
      schoolId: this.schoolId,
      schoolName: this.schoolName || null,
      gradeName: selectedGrade?.name ?? null,
      teacherName: selectedTeacher?.name ?? null,
    });
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
