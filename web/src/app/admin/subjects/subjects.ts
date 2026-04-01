import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { Grade } from '../grades/grade';
import { Status } from '../users/status';
import { SchoolSubject } from './subject';
import { SubjectTeacherOption } from './subject-teacher-option';
import { Teacher } from '../teachers/teacher';

@Component({
  selector: 'app-admin-subjects',
  standalone: false,
  templateUrl: './subjects.html',
  styleUrl: './subjects.scss',
})
export class AdminSubjects implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  showForm = false;
  selectedSubject: SchoolSubject | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  availableGrades: Grade[] = [];
  teacherOptions: SubjectTeacherOption[] = [];

  subjects: SchoolSubject[] = [];

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit() {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? '';
        this.loadReferenceData();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredSubjects(): SchoolSubject[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.subjects;
    }

    return this.subjects.filter(subject =>
      subject.code.toLowerCase().includes(query)
      || subject.name.toLowerCase().includes(query)
      || (subject.gradeName ?? '').toLowerCase().includes(query)
      || (subject.teacherName ?? '').toLowerCase().includes(query)
    );
  }

  openForm(subject: SchoolSubject | null = null) {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing subjects.';
      return;
    }

    this.selectedSubject = subject;
    this.showForm = true;
    this.errorMessage = '';
  }

  closeForm() {
    this.showForm = false;
    this.selectedSubject = null;
  }

  viewSubject(subject: SchoolSubject) {
    this.router.navigate(['/admin/subjects', subject.id]);
  }

  onSaved(subject: SchoolSubject) {
    if (this.selectedSubject) {
      const id = this.selectedSubject.id!;
      const payload: SchoolSubject = { ...subject, schoolId: this.selectedSchoolId };

      this.backendService.put<SchoolSubject, SchoolSubject>(`subject/${id}`, payload).subscribe({
        next: (updated) => {
          this.subjects = this.subjects.map(item =>
            item.id === id ? this.mapSavedSubject(updated) : item
          );
          this.closeForm();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to update subject.';
        },
      });
      return;
    }

    const payload: SchoolSubject = {
      ...subject,
      schoolId: this.selectedSchoolId,
    };

    this.backendService.post<SchoolSubject, SchoolSubject>('subject', payload).subscribe({
      next: (savedSubject) => {
        this.subjects = [this.mapSavedSubject(savedSubject), ...this.subjects];
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to create subject.';
      },
    });
  }

  deleteSubject(subject: SchoolSubject) {
    if (!subject.id) return;

    this.backendService.delete(`subject/${subject.id}`).subscribe({
      next: () => {
        this.subjects = this.subjects.filter(s => s.id !== subject.id);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete subject.';
      },
    });
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  private loadReferenceData() {
    if (!this.selectedSchoolId) {
      this.availableGrades = [];
      this.teacherOptions = [];
      this.subjects = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.selectedSchoolId }).subscribe({
      next: (subjects) => {
        this.subjects = (subjects ?? []).map(s => this.mapSavedSubject(s));
      },
      error: (error: HttpErrorResponse) => {
        this.subjects = [];
        this.errorMessage = error.error?.message || 'Failed to load subjects.';
      },
    });

    this.backendService.get<Grade[]>('grade').subscribe({
      next: (grades) => {
        this.availableGrades = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      },
      error: () => {
        this.availableGrades = [];
      },
    });

    this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }).subscribe({
      next: (teachers) => {
        this.teacherOptions = (teachers ?? []).map(teacher => ({
          id: teacher.id ?? 0,
          name: teacher.userFullName || teacher.userEmail || 'Unknown Teacher',
          schoolId: teacher.schoolId ?? null,
        })).filter(teacher => teacher.id > 0);
      },
      error: (error: HttpErrorResponse) => {
        this.teacherOptions = [];
        this.errorMessage = error.error?.message || 'Failed to load teachers for subjects.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private mapSavedSubject(subject: SchoolSubject): SchoolSubject {
    const gradeName = this.availableGrades.find(grade => grade.id === subject.gradeId)?.name ?? subject.gradeName ?? null;
    const teacherName = this.teacherOptions.find(teacher => teacher.id === subject.teacherId)?.name ?? subject.teacherName ?? null;

    return {
      ...subject,
      schoolId: subject.schoolId ?? this.selectedSchoolId,
      schoolName: subject.schoolName ?? (this.selectedSchoolName || null),
      gradeName,
      teacherName,
    };
  }
}
