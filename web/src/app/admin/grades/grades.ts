import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SchoolContextService } from '../layout/school-context';
import { BackendService } from '../../util/backend.service';
import { Grade } from './grade';

interface SchoolOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-admin-grades',
  standalone: false,
  templateUrl: './grades.html',
  styleUrl: './grades.scss',
})
export class AdminGrades implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  schools: SchoolOption[] = [];
  grades: Grade[] = [];
  isLoadingSchools = false;
  isLoadingGrades = false;
  errorMessage = '';
  showGradeForm = false;
  selectedSchoolId: number | null = null;
  showActionMessage = false;
  actionMessage = '';
  editingGrade: Grade | null = null;
  showDeleteDialog = false;
  gradeToDelete: Grade | null = null;
  isProcessing = false;
  importMessage = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
      });

    this.loadSchools();
    this.loadGrades();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedSchoolName(): string {
    const selected = this.schools.find(school => school.id === this.selectedSchoolId);
    return selected?.name ?? this.schoolContext.selectedSchool?.name ?? 'No school selected';
  }

  get visibleGrades(): Grade[] {
    if (!this.selectedSchoolId) {
      return this.grades;
    }

    return this.grades.filter(grade => grade.schoolId === this.selectedSchoolId);
  }

  openAddGradeForm(): void {
    this.editingGrade = null;
    this.showGradeForm = true;
  }

  openImportGrades(): void {
    this.importMessage = 'Grade import will be added next.';
    setTimeout(() => {
      this.importMessage = '';
    }, 2500);
  }

  closeAddGradeForm(): void {
    this.showGradeForm = false;
    this.editingGrade = null;
  }

  onGradeSaved(grade: Grade): void {
    const exists = this.grades.some(item => item.id === grade.id);
    this.grades = exists
      ? this.grades.map(item => item.id === grade.id ? grade : item)
      : [grade, ...this.grades];
    this.showGradeForm = false;
  }

  viewGrade(grade: Grade): void {
    this.showTemporaryMessage(`View for "${grade.name}" will be added next.`);
  }

  editGrade(grade: Grade): void {
    this.editingGrade = { ...grade };
    this.showGradeForm = true;
  }

  removeGrade(grade: Grade): void {
    if (!grade.id || this.isProcessing) {
      return;
    }

    this.gradeToDelete = grade;
    this.showDeleteDialog = true;
  }

  cancelDeleteGrade(): void {
    this.gradeToDelete = null;
    this.showDeleteDialog = false;
  }

  confirmDeleteGrade(): void {
    if (!this.gradeToDelete?.id || this.isProcessing) {
      return;
    }

    const targetGrade = this.gradeToDelete;

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`grade/${targetGrade.id}`).subscribe({
      next: () => {
        this.grades = this.grades.filter(item => item.id !== targetGrade.id);
        this.cancelDeleteGrade();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to remove grade.';
        this.cancelDeleteGrade();
        this.isProcessing = false;
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  private loadGrades(): void {
    this.isLoadingGrades = true;
    this.errorMessage = '';

    this.backendService.get<Grade[]>('grade').subscribe({
      next: (grades) => {
        this.grades = grades ?? [];
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load grades.';
      },
      complete: () => {
        this.isLoadingGrades = false;
      },
    });
  }

  private loadSchools(): void {
    this.isLoadingSchools = true;

    this.backendService.get<SchoolOption[]>('school').subscribe({
      next: (schools) => {
        this.schools = schools ?? [];

        if (!this.selectedSchoolId) {
          const contextSchoolId = this.schoolContext.selectedSchool?.id ?? null;
          const defaultSchool = this.schools.find(school => school.id === contextSchoolId) ?? this.schools[0];
          this.selectedSchoolId = defaultSchool?.id ?? null;
        }
      },
      error: (_: HttpErrorResponse) => {
        this.schools = [];
        this.errorMessage = 'Failed to load schools.';
      },
      complete: () => {
        this.isLoadingSchools = false;
      },
    });
  }

  private showTemporaryMessage(message: string): void {
    this.actionMessage = message;
    this.showActionMessage = true;

    setTimeout(() => {
      this.showActionMessage = false;
      this.actionMessage = '';
    }, 2500);
  }
}
