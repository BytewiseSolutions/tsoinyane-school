import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';
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
  readonly Status = Status;
  readonly pageSizeOptions = [10, 25, 50];

  showForm = false;
  selectedSubject: SchoolSubject | null = null;
  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  isLoading = false;
  errorMessage = '';
  searchTerm = '';
  selectedStatusFilter: Status | 'ALL' = 'ALL';
  selectedGradeFilter: number | null = null;
  selectedTeacherFilter: number | null = null;
  selectedSort = 'code-asc';
  pageSize = 10;
  currentPage = 1;
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
    return [...this.subjects]
      .filter(subject => this.matchesSearch(subject, query))
      .filter(subject => this.selectedStatusFilter === 'ALL' || subject.status === this.selectedStatusFilter)
      .filter(subject => this.selectedGradeFilter === null || subject.gradeId === this.selectedGradeFilter)
      .filter(subject => this.selectedTeacherFilter === null || subject.teacherId === this.selectedTeacherFilter)
      .sort((left, right) => this.compareSubjects(left, right));
  }

  get paginatedSubjects(): SchoolSubject[] {
    const start = (this.safeCurrentPage - 1) * this.pageSize;
    return this.filteredSubjects.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSubjects.length / this.pageSize));
  }

  get safeCurrentPage(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageStart(): number {
    if (!this.filteredSubjects.length) {
      return 0;
    }

    return (this.safeCurrentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.safeCurrentPage * this.pageSize, this.filteredSubjects.length);
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

  onFiltersChanged() {
    this.currentPage = 1;
  }

  onPageSizeChanged() {
    this.currentPage = 1;
  }

  goToPreviousPage() {
    if (this.safeCurrentPage > 1) {
      this.currentPage = this.safeCurrentPage - 1;
    }
  }

  goToNextPage() {
    if (this.safeCurrentPage < this.totalPages) {
      this.currentPage = this.safeCurrentPage + 1;
    }
  }

  private matchesSearch(subject: SchoolSubject, query: string): boolean {
    if (!query) {
      return true;
    }

    return subject.code.toLowerCase().includes(query)
      || subject.name.toLowerCase().includes(query)
      || (subject.gradeName ?? '').toLowerCase().includes(query)
      || (subject.teacherName ?? '').toLowerCase().includes(query);
  }

  private compareSubjects(left: SchoolSubject, right: SchoolSubject): number {
    switch (this.selectedSort) {
      case 'code-desc':
        return this.compareText(right.code, left.code);
      case 'name-asc':
        return this.compareText(left.name, right.name);
      case 'name-desc':
        return this.compareText(right.name, left.name);
      case 'grade-asc':
        return this.compareText(left.gradeName, right.gradeName);
      case 'grade-desc':
        return this.compareText(right.gradeName, left.gradeName);
      case 'teacher-asc':
        return this.compareText(left.teacherName, right.teacherName);
      case 'teacher-desc':
        return this.compareText(right.teacherName, left.teacherName);
      case 'code-asc':
      default:
        return this.compareText(left.code, right.code);
    }
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private loadReferenceData() {
    if (!this.selectedSchoolId) {
      this.availableGrades = [];
      this.teacherOptions = [];
      this.subjects = [];
      this.isLoading = false;
      this.errorMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const errorMessages: string[] = [];

    forkJoin({
      subjects: this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.selectedSchoolId }).pipe(
        catchError((error: HttpErrorResponse) => {
          errorMessages.push(error.error?.message || 'Failed to load subjects.');
          return of([] as SchoolSubject[]);
        })
      ),
      grades: this.backendService.get<Grade[]>('grade').pipe(
        catchError(() => of([] as Grade[]))
      ),
      teachers: this.backendService.get<Teacher[]>('teacher', { schoolId: this.selectedSchoolId }).pipe(
        catchError((error: HttpErrorResponse) => {
          errorMessages.push(error.error?.message || 'Failed to load teachers for subjects.');
          return of([] as Teacher[]);
        })
      ),
    })
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe(({ subjects, grades, teachers }) => {
        this.availableGrades = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
        this.teacherOptions = (teachers ?? []).map(teacher => ({
          id: teacher.id ?? 0,
          name: teacher.userFullName || teacher.userEmail || 'Unknown Teacher',
          schoolId: teacher.schoolId ?? null,
          gradeIds: teacher.gradeIds ?? [],
        })).filter(teacher => teacher.id > 0);
        this.subjects = (subjects ?? []).map(subject => this.mapSavedSubject(subject));
        this.errorMessage = errorMessages.join(' ');
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
