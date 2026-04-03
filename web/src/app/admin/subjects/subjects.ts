import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, catchError, finalize, forkJoin, map, of, switchMap, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
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
  showDeleteDialog = false;
  showStatusDialog = false;
  selectedSubject: SchoolSubject | null = null;
  subjectToDelete: SchoolSubject | null = null;
  subjectToToggleStatus: SchoolSubject | null = null;
  pendingStatus: Status = Status.INACTIVE;
  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  isLoading = false;
  isProcessing = false;
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
  subjectCatalog: SchoolSubject[] = [];

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
        this.resetFilters();
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
      .filter(subject => this.selectedGradeFilter === null || Number(subject.gradeId ?? 0) === Number(this.selectedGradeFilter))
      .filter(subject => this.selectedTeacherFilter === null || Number(subject.teacherId ?? 0) === Number(this.selectedTeacherFilter))
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

  get totalSubjects(): number {
    return new Set(
      this.subjects
        .map(subject => Number(subject.subjectId ?? subject.id ?? 0))
        .filter(subjectId => subjectId > 0)
    ).size;
  }

  get teacherFilterOptions(): SubjectTeacherOption[] {
    const teacherIdsWithSubjects = new Set(
      this.subjects
        .map(subject => Number(subject.teacherId ?? 0))
        .filter(teacherId => teacherId > 0)
    );

    return this.teacherOptions.filter(teacher => teacherIdsWithSubjects.has(Number(teacher.id)));
  }

  get activeSubjectsCount(): number {
    return this.subjects.filter(subject => subject.status !== Status.INACTIVE).length;
  }

  get inactiveSubjectsCount(): number {
    return this.subjects.filter(subject => subject.status === Status.INACTIVE).length;
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
    const payload: SchoolSubject = {
      ...subject,
      schoolId: this.selectedSchoolId,
    };

    if (this.selectedSubject) {
      this.updateSubjectAssignment(payload);
      return;
    }

    this.createSubjectAssignment(payload);
  }

  deleteSubject(subject: SchoolSubject) {
    if (!subject.id || this.isProcessing) return;

    this.subjectToDelete = subject;
    this.showDeleteDialog = true;
  }

  cancelDeleteSubject() {
    this.subjectToDelete = null;
    this.showDeleteDialog = false;
  }

  confirmDeleteSubject() {
    if (!this.subjectToDelete?.assignmentId || this.isProcessing) return;

    const targetSubject = this.subjectToDelete;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete(`subject-assignment/${targetSubject.assignmentId}`)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
      next: () => {
        this.subjects = this.subjects.filter(subject => subject.id !== targetSubject.id);
        this.cancelDeleteSubject();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete subject.';
        this.cancelDeleteSubject();
      },
    });
  }

  toggleStatus(subject: SchoolSubject) {
    if (!subject.id || this.isProcessing) {
      return;
    }

    this.pendingStatus = subject.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;
    this.subjectToToggleStatus = subject;
    this.showStatusDialog = true;
  }

  cancelToggleStatus() {
    this.subjectToToggleStatus = null;
    this.showStatusDialog = false;
  }

  confirmToggleStatus() {
    if (!this.subjectToToggleStatus?.id || this.isProcessing) {
      return;
    }

    const targetSubject = this.subjectToToggleStatus;
    this.isProcessing = true;
    this.errorMessage = '';

    const payload: SchoolSubject = {
      ...targetSubject,
      schoolId: this.selectedSchoolId,
      status: this.pendingStatus,
    };

    this.saveSubjectAssignment(payload, true, targetSubject).pipe(
      finalize(() => {
        this.isProcessing = false;
      })
    ).subscribe({
      next: (updatedSubject) => {
        this.subjects = this.subjects.map(subject =>
          subject.assignmentId === updatedSubject.assignmentId ? this.mapSavedSubject(updatedSubject) : subject
        );
        this.cancelToggleStatus();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update subject status.';
        this.cancelToggleStatus();
      },
    });
  }

  getStatusLabel(status: Status | null | undefined): string {
    return status === Status.INACTIVE ? 'Inactive' : 'Active';
  }

  exportSubjects() {
    if (!this.filteredSubjects.length) {
      this.errorMessage = 'No subjects available to export for the current filters.';
      return;
    }

    const rows = this.filteredSubjects.map(subject => ({
      'Subject Code': subject.code,
      'Subject Name': subject.name,
      Grade: subject.gradeName ?? '',
      Teacher: subject.teacherName ?? '',
      'Student Count': subject.studentCount ?? 0,
      Status: this.getStatusLabel(subject.status),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');
    XLSX.writeFile(
      workbook,
      `subjects_${(this.selectedSchoolName || 'school').replace(/\s+/g, '_')}.xlsx`
    );
    this.errorMessage = '';
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
      catalogSubjects: this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.selectedSchoolId }).pipe(
        catchError(() => of([] as SchoolSubject[]))
      ),
      assignments: this.backendService.get<any[]>('subject-assignment', { schoolId: this.selectedSchoolId }).pipe(
        catchError((error: HttpErrorResponse) => {
          errorMessages.push(error.error?.message || 'Failed to load subject assignments.');
          return of([] as any[]);
        })
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
      .subscribe(({ grades, catalogSubjects, assignments, teachers }) => {
        this.availableGrades = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
        this.teacherOptions = (teachers ?? []).map(teacher => ({
          id: Number(teacher.id ?? 0),
          name: teacher.userFullName || teacher.userEmail || 'Unknown Teacher',
          schoolId: teacher.schoolId ?? null,
          gradeIds: (teacher.gradeIds ?? []).map(id => Number(id)),
        })).filter(teacher => teacher.id > 0);
        this.subjectCatalog = (catalogSubjects ?? []).map(subject => ({
          ...subject,
          id: Number(subject.id ?? 0),
          subjectId: Number(subject.id ?? 0),
        }));
        this.subjects = (assignments ?? []).map(assignment => this.mapAssignmentToSubject(assignment));
        this.ensureValidFilters();
        this.errorMessage = errorMessages.join(' ');
      });
  }

  private mapSavedSubject(subject: SchoolSubject): SchoolSubject {
    const gradeId = subject.gradeId != null ? Number(subject.gradeId) : null;
    const teacherId = subject.teacherId != null ? Number(subject.teacherId) : null;
    const gradeName = this.availableGrades.find(grade => Number(grade.id) === gradeId)?.name ?? subject.gradeName ?? null;
    const teacherName = this.teacherOptions.find(teacher => teacher.id === teacherId)?.name ?? subject.teacherName ?? null;

    return {
      ...subject,
      schoolId: subject.schoolId ?? this.selectedSchoolId,
      schoolName: subject.schoolName ?? (this.selectedSchoolName || null),
      gradeId,
      gradeName,
      teacherId,
      teacherName,
      studentCount: Number(subject.studentCount ?? 0),
    };
  }

  private mapAssignmentToSubject(assignment: any): SchoolSubject {
    return this.mapSavedSubject({
      id: Number(assignment.subjectId ?? 0),
      subjectId: Number(assignment.subjectId ?? 0),
      assignmentId: Number(assignment.id ?? 0),
      code: assignment.subjectCode ?? '',
      name: assignment.subjectName ?? '',
      schoolId: assignment.schoolId ?? this.selectedSchoolId,
      schoolName: assignment.schoolName ?? this.selectedSchoolName,
      gradeId: assignment.gradeId ?? null,
      gradeName: assignment.gradeName ?? null,
      teacherId: assignment.teacherId ?? null,
      teacherName: assignment.teacherName ?? null,
      studentCount: assignment.studentCount ?? 0,
      status: assignment.status ?? Status.ACTIVE,
    });
  }

  private createSubjectAssignment(subject: SchoolSubject): void {
    this.saveSubjectAssignment(subject, false).subscribe({
      next: (savedSubject) => {
        this.subjects = [this.mapSavedSubject(savedSubject), ...this.subjects];
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to create subject assignment.';
      },
    });
  }

  private updateSubjectAssignment(subject: SchoolSubject): void {
    this.saveSubjectAssignment(subject, true, this.selectedSubject ?? undefined).subscribe({
      next: (updated) => {
        this.subjects = this.subjects.map(item =>
          item.assignmentId === updated.assignmentId ? this.mapSavedSubject(updated) : item
        );
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update subject assignment.';
      },
    });
  }

  private saveSubjectAssignment(subject: SchoolSubject, isEdit: boolean, existing?: SchoolSubject) {
    const catalogSubject = this.findCatalogSubjectByCode(subject.code, existing?.subjectId ?? null);
    const subjectPayload: SchoolSubject = {
      code: subject.code,
      name: subject.name,
      schoolId: this.selectedSchoolId,
      schoolName: this.selectedSchoolName || null,
      gradeId: null,
      gradeName: null,
      teacherId: null,
      teacherName: null,
      status: subject.status,
    };

    const subjectRequest$ = existing?.subjectId
      ? this.backendService.put<SchoolSubject, SchoolSubject>(`subject/${existing.subjectId}`, {
          ...subjectPayload,
          id: existing.subjectId,
        })
      : catalogSubject?.subjectId
        ? of(catalogSubject)
        : this.backendService.post<SchoolSubject, SchoolSubject>('subject', subjectPayload);

    return subjectRequest$.pipe(
      switchMap((savedCatalog: SchoolSubject) => {
        const assignmentPayload = {
          subjectId: savedCatalog.subjectId ?? savedCatalog.id ?? null,
          schoolId: this.selectedSchoolId,
          gradeId: subject.gradeId,
          teacherId: subject.teacherId,
          status: subject.status,
        };

        const assignmentRequest$ = isEdit && existing?.assignmentId
          ? this.backendService.put<any, any>(`subject-assignment/${existing.assignmentId}`, assignmentPayload)
          : this.backendService.post<any, any>('subject-assignment', assignmentPayload);

        return assignmentRequest$.pipe(
          map(assignment => this.mapAssignmentToSubject(assignment))
        );
      })
    );
  }

  private findCatalogSubjectByCode(code: string, excludeSubjectId: number | null): SchoolSubject | null {
    const normalizedCode = code.trim().toLowerCase();
    return this.subjectCatalog.find(subject =>
      (subject.code ?? '').trim().toLowerCase() === normalizedCode
      && Number(subject.subjectId ?? subject.id ?? 0) !== Number(excludeSubjectId ?? 0)
    ) ?? null;
  }

  private ensureValidFilters(): void {
    const hasSelectedGrade = this.selectedGradeFilter != null
      && this.availableGrades.some(grade => Number(grade.id) === Number(this.selectedGradeFilter));
    if (!hasSelectedGrade) {
      this.selectedGradeFilter = null;
    }

    const hasSelectedTeacher = this.selectedTeacherFilter != null
      && this.teacherFilterOptions.some(teacher => teacher.id === Number(this.selectedTeacherFilter));
    if (!hasSelectedTeacher) {
      this.selectedTeacherFilter = null;
    }
  }

  private resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatusFilter = 'ALL';
    this.selectedGradeFilter = null;
    this.selectedTeacherFilter = null;
    this.selectedSort = 'code-asc';
    this.currentPage = 1;
  }
}
