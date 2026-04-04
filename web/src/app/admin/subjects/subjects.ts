import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { Status } from '../users/status';
import { SchoolSubject } from './subject';

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
  selectedSort = 'code-asc';
  pageSize = 10;
  currentPage = 1;

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
        this.resetFilters();
        this.loadSubjects();
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
    return this.subjects.length;
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
    const subjectId = Number(subject.subjectId ?? subject.id ?? 0);
    this.router.navigate(['/admin/subjects', subjectId]);
  }

  onSaved(subject: SchoolSubject) {
    const payload: SchoolSubject = {
      ...subject,
      schoolId: this.selectedSchoolId,
    };

    if (this.selectedSubject) {
      this.updateSubject(payload);
      return;
    }

    this.createSubject(payload);
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
    const targetSubjectId = Number(this.subjectToDelete?.subjectId ?? this.subjectToDelete?.id ?? 0);
    if (!targetSubjectId || this.isProcessing) return;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete(`subject/${targetSubjectId}`)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: () => {
          this.subjects = this.subjects.filter(subject =>
            Number(subject.subjectId ?? subject.id ?? 0) !== targetSubjectId
          );
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
    const targetSubjectId = Number(this.subjectToToggleStatus?.subjectId ?? this.subjectToToggleStatus?.id ?? 0);
    if (!targetSubjectId || this.isProcessing) {
      return;
    }

    const targetSubject = this.subjectToToggleStatus!;
    this.isProcessing = true;
    this.errorMessage = '';

    const payload: SchoolSubject = {
      ...targetSubject,
      schoolId: this.selectedSchoolId,
      status: this.pendingStatus,
    };

    this.saveSubject(payload, targetSubjectId)
      .pipe(finalize(() => {
        this.isProcessing = false;
      }))
      .subscribe({
        next: updatedSubject => {
          this.subjects = this.subjects.map(subject =>
            Number(subject.subjectId ?? subject.id ?? 0) === targetSubjectId
              ? this.mapSavedSubject(updatedSubject)
              : subject
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
      || subject.name.toLowerCase().includes(query);
  }

  private compareSubjects(left: SchoolSubject, right: SchoolSubject): number {
    switch (this.selectedSort) {
      case 'code-desc':
        return this.compareText(right.code, left.code);
      case 'name-asc':
        return this.compareText(left.name, right.name);
      case 'name-desc':
        return this.compareText(right.name, left.name);
      case 'code-asc':
      default:
        return this.compareText(left.code, right.code);
    }
  }

  private compareText(left: string | null | undefined, right: string | null | undefined): number {
    return (left ?? '').localeCompare(right ?? '', undefined, { sensitivity: 'base' });
  }

  private loadSubjects() {
    if (!this.selectedSchoolId) {
      this.subjects = [];
      this.isLoading = false;
      this.errorMessage = '';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<SchoolSubject[]>('subject', { schoolId: this.selectedSchoolId })
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: subjects => {
          this.subjects = (subjects ?? []).map(subject => this.mapSavedSubject(subject));
        },
        error: (error: HttpErrorResponse) => {
          this.subjects = [];
          this.errorMessage = error.error?.message || 'Failed to load subjects.';
        },
      });
  }

  private mapSavedSubject(subject: SchoolSubject): SchoolSubject {
    return {
      ...subject,
      id: Number(subject.id ?? subject.subjectId ?? 0),
      subjectId: Number(subject.subjectId ?? subject.id ?? 0),
      schoolId: subject.schoolId ?? this.selectedSchoolId,
      schoolName: subject.schoolName ?? (this.selectedSchoolName || null),
      gradeId: null,
      gradeName: null,
      teacherId: null,
      teacherName: null,
      studentCount: null,
      assignmentId: null,
      assignmentCount: Number(subject.assignmentCount ?? 0),
      status: subject.status ?? Status.ACTIVE,
    };
  }

  private createSubject(subject: SchoolSubject): void {
    this.saveSubject(subject).subscribe({
      next: savedSubject => {
        this.subjects = [this.mapSavedSubject(savedSubject), ...this.subjects];
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to create subject.';
      },
    });
  }

  private updateSubject(subject: SchoolSubject): void {
    const targetSubjectId = Number(this.selectedSubject?.subjectId ?? this.selectedSubject?.id ?? 0);
    if (!targetSubjectId) {
      this.errorMessage = 'Failed to update subject.';
      return;
    }

    this.saveSubject(subject, targetSubjectId).subscribe({
      next: updatedSubject => {
        this.subjects = this.subjects.map(item =>
          Number(item.subjectId ?? item.id ?? 0) === targetSubjectId
            ? this.mapSavedSubject(updatedSubject)
            : item
        );
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to update subject.';
      },
    });
  }

  private saveSubject(subject: SchoolSubject, subjectId?: number) {
    const subjectPayload: SchoolSubject = {
      code: subject.code,
      name: subject.name,
      schoolId: this.selectedSchoolId,
      schoolName: this.selectedSchoolName || null,
      gradeId: null,
      gradeName: null,
      teacherId: null,
      teacherName: null,
      status: subjectId ? (subject.status ?? Status.ACTIVE) : (subject.status ?? null),
    };

    return subjectId
      ? this.backendService.put<SchoolSubject, SchoolSubject>(`subject/${subjectId}`, {
          ...subjectPayload,
          id: subjectId,
        })
      : this.backendService.post<SchoolSubject, SchoolSubject>('subject', subjectPayload);
  }

  private resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatusFilter = 'ALL';
    this.selectedSort = 'code-asc';
    this.currentPage = 1;
  }
}
