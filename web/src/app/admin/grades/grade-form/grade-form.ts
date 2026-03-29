import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../grade';

@Component({
  selector: 'app-grade-form',
  standalone: false,
  templateUrl: './grade-form.html',
  styleUrl: './grade-form.scss',
})
export class GradeForm implements OnInit {
  @Input() existingGrade: Grade | null = null;
  @Input() selectedSchoolId: number | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Grade>();

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  isEdit = false;

  form: Grade = {
    id: undefined,
    name: '',
    schoolId: null,
  };

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    if (this.existingGrade) {
      this.isEdit = true;
      this.form = {
        ...this.existingGrade,
        schoolId: this.existingGrade.schoolId ?? this.selectedSchoolId ?? this.schoolContext.selectedSchool?.id ?? null,
      };
      return;
    }

    this.form.schoolId = this.selectedSchoolId ?? this.schoolContext.selectedSchool?.id ?? null;
  }

  get gradePlaceholder(): string {
    const schoolName = this.schoolContext.selectedSchool?.name?.trim().toLowerCase() ?? '';

    if (schoolName.includes('high')) {
      return 'Grade 8';
    }

    return 'Grade 1';
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const name = this.form.name.trim();
    const schoolId = this.form.schoolId;

    if (!name) {
      this.errorMessage = 'Grade name is required.';
      return;
    }

    if (!schoolId) {
      this.errorMessage = 'Please select a school from the top header first.';
      return;
    }

    this.isSubmitting = true;

    const payload: Grade = {
      id: this.isEdit ? this.form.id : undefined,
      name,
      schoolId,
    };

    const request$ = this.isEdit && this.form.id
      ? this.backendService.put<Grade, Grade>(`grade/${this.form.id}`, payload)
      : this.backendService.post<Grade, Grade>('grade', payload);

    request$.subscribe({
      next: (savedGrade) => {
        this.successMessage = this.isEdit ? 'Grade updated successfully.' : 'Grade created successfully.';
        this.saved.emit(savedGrade);
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || (this.isEdit ? 'Failed to update grade.' : 'Failed to create grade.');
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
