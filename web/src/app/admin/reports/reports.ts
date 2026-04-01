import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { SchoolContextService } from '../layout/school-context';
import { StudentReport } from './student-report';

interface GradeOption { id: number; name: string; }
interface StudentOption { id: number; name: string; studentNumber: string; gradeId: number; }

@Component({
  selector: 'app-reports',
  standalone: false,
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  selectedSchoolId: number | null = null;
  grades: GradeOption[] = [];
  students: StudentOption[] = [];
  selectedGradeId: number | null = null;
  selectedStudentId: number | null = null;

  report: StudentReport | null = null;
  loading = false;
  error = '';

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.reset();
        if (this.selectedSchoolId) {
          this.loadGrades();
          this.loadStudents();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredStudents(): StudentOption[] {
    if (!this.selectedGradeId) return this.students;
    return this.students.filter(s => s.gradeId === this.selectedGradeId);
  }

  onGradeChange(): void {
    this.selectedStudentId = null;
    this.report = null;
    this.error = '';
  }

  onStudentChange(): void {
    this.report = null;
    this.error = '';
    if (this.selectedStudentId) this.loadReport();
  }

  getRateClass(rate: number): string {
    if (rate >= 80) return 'rate-good';
    if (rate >= 60) return 'rate-average';
    return 'rate-poor';
  }

  private loadReport(): void {
    if (!this.selectedStudentId) return;
    this.loading = true;
    this.error = '';

    this.backendService.get<StudentReport>(`report/student/${this.selectedStudentId}`).subscribe({
      next: (report) => { this.report = report; },
      error: (e: HttpErrorResponse) => { this.error = e.error?.message || 'Failed to load report.'; },
      complete: () => { this.loading = false; },
    });
  }

  private loadGrades(): void {
    if (!this.selectedSchoolId) return;
    this.backendService.get<any[]>('grade', { schoolId: this.selectedSchoolId }).subscribe({
      next: (grades) => { this.grades = (grades ?? []).map(g => ({ id: g.id, name: g.name })); },
    });
  }

  private loadStudents(): void {
    if (!this.selectedSchoolId) return;
    this.backendService.get<any[]>('user', { schoolId: this.selectedSchoolId, role: 'STUDENT' }).subscribe({
      next: (users) => {
        this.students = (users ?? []).map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          studentNumber: u.studentId ?? '',
          gradeId: u.gradeId,
        }));
      },
    });
  }

  private reset(): void {
    this.grades = [];
    this.students = [];
    this.selectedGradeId = null;
    this.selectedStudentId = null;
    this.report = null;
    this.error = '';
  }
}
