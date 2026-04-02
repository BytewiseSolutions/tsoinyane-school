import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../../util/backend.service';
import { SchoolContextService } from '../../layout/school-context';
import { Grade } from '../../grades/grade';
import { Teacher } from '../../teachers/teacher';

interface ImportResult {
  totalRows: number;
  successfulImports: number;
  errors: string[];
}

@Component({
  selector: 'app-subjects-import',
  standalone: false,
  templateUrl: './import.html',
  styleUrl: './import.scss',
})
export class SubjectsImport implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  selectedSchoolName = '';
  selectedFile: File | null = null;
  isUploading = false;
  errorMessage = '';
  successMessage = '';
  importResult: ImportResult | null = null;
  availableGrades: Grade[] = [];
  availableTeachers: Teacher[] = [];

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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.errorMessage = '';
      this.successMessage = '';
      this.importResult = null;
    }
  }

  downloadTemplate() {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select the current school from the top header before downloading template.';
      return;
    }

    const headers = ['Subject Code', 'Subject Name', 'Grade Name', 'Teacher Name', 'Status'];

    const csvContent = headers.map(header => `"${header}"`).join(',');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subjects_import_template_${this.selectedSchoolName?.replace(/\s+/g, '_') || 'school'}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  uploadFile() {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file to upload.';
      return;
    }

    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select the current school from the top header before importing.';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('schoolId', this.selectedSchoolId.toString());

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.importResult = null;

    this.backendService.post<ImportResult, FormData>('subject/import', formData).subscribe({
      next: (result) => {
        this.importResult = result;
        if (result.errors.length === 0) {
          this.successMessage = `Successfully imported ${result.successfulImports} subjects out of ${result.totalRows} rows.`;
        } else {
          this.errorMessage = `Imported ${result.successfulImports} subjects out of ${result.totalRows} rows with ${result.errors.length} errors.`;
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to import subjects.';
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin/subjects']);
  }

  private loadReferenceData() {
    if (!this.selectedSchoolId) {
      this.availableGrades = [];
      this.availableTeachers = [];
      return;
    }

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
        this.availableTeachers = teachers ?? [];
      },
      error: () => {
        this.availableTeachers = [];
      },
    });
  }
}
