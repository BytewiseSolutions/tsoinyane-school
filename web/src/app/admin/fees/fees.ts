import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { Grade } from '../grades/grade';
import { SchoolContextService } from '../layout/school-context';
import { Term } from '../settings/term';
import { FeeStructure } from './fee-structure';
import { FeeStructureFormSubmission } from './fee-structure-form-submission';

interface FeeStructureRow {
  primaryStructureId: number | null;
  structureCount: number;
  term: Term | null;
  academicYear: string;
  registrationFee: string;
  schoolFee: string;
  examFee: string;
}

@Component({
  selector: 'app-fees',
  standalone: false,
  templateUrl: './fees.html',
  styleUrl: './fees.scss',
})
export class Fees implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  readonly termOptions = [Term.TERM_1, Term.TERM_2, Term.TERM_3, Term.TERM_4];

  selectedSchoolId: number | null = null;
  selectedSchoolName = 'No school selected';
  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  actionMessage = '';
  searchTerm = '';
  selectedGradeFilter: number | null = null;
  selectedTermFilter: Term | 'ALL' = 'ALL';
  structures: FeeStructure[] = [];
  gradeOptions: Grade[] = [];
  showForm = false;
  editingStructure: FeeStructure | null = null;
  showDeleteDialog = false;
  structureToDelete: FeeStructure | null = null;
  showManageDialog = false;
  managedRow: FeeStructureRow | null = null;

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.schoolContext.selectedSchool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(school => {
        this.selectedSchoolId = school?.id ?? null;
        this.selectedSchoolName = school?.name ?? 'No school selected';
        this.loadData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredStructures(): FeeStructure[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.structures
      .filter(structure => !this.selectedGradeFilter || structure.gradeId === this.selectedGradeFilter)
      .filter(structure => this.selectedTermFilter === 'ALL' || structure.term === this.selectedTermFilter)
      .filter(structure => {
        if (!query) {
          return true;
        }

        return (structure.gradeName ?? '').toLowerCase().includes(query)
          || (structure.academicYear ?? '').toLowerCase().includes(query);
      });
  }

  get filteredRows(): FeeStructureRow[] {
    const academicYear = this.tableAcademicYear;
    const rows = this.termOptions.map(term => {
      const termStructures = this.filteredStructures
        .filter(structure => structure.academicYear === academicYear)
        .filter(structure => structure.term === term);
      const representative = this.getRepresentativeStructure(termStructures);

      if (!termStructures.length) {
        return {
          primaryStructureId: null,
          structureCount: 0,
          term,
          academicYear,
          registrationFee: '0.00',
          schoolFee: '0.00',
          examFee: '0.00',
        };
      }

      return {
        primaryStructureId: representative?.id ?? null,
        structureCount: termStructures.length,
        term,
        academicYear,
        registrationFee: this.formatDistinctFeeValues(termStructures.map(structure => Number(structure.registrationFee ?? 0))),
        schoolFee: this.formatDistinctFeeValues(termStructures.map(structure => Number(structure.schoolFee ?? 0))),
        examFee: this.formatDistinctFeeValues(termStructures.map(structure => Number(structure.examFee ?? 0))),
      };
    });

    return this.selectedTermFilter !== 'ALL'
      ? rows.filter(row => row.term === this.selectedTermFilter)
      : rows;
  }

  get summaryRegistrationFee(): string {
    const values = this.getSummaryStructures(Term.TERM_1)
      .map(structure => Number(structure.registrationFee ?? 0))
      .filter(value => value > 0);

    return this.formatAmountSummary(values);
  }

  get summarySchoolFee(): string {
    const values = this.getSummaryStructures(this.summaryTerm)
      .map(structure => Number(structure.schoolFee ?? 0))
      .filter(value => value > 0);

    return this.formatAmountSummary(values);
  }

  get summaryExamFee(): string {
    const values = this.getSummaryStructures()
      .map(structure => Number(structure.examFee ?? 0))
      .filter(value => value > 0);

    return this.formatAmountSummary(values);
  }

  get summaryTermLabel(): string {
    return this.getTermLabel(this.summaryTerm);
  }

  getTermLabel(term: Term | null | undefined): string {
    return (term ?? '').replace('_', ' ');
  }

  onFiltersChanged(): void {
    this.actionMessage = '';
  }

  openForm(structure: FeeStructure | null = null): void {
    if (!this.selectedSchoolId) {
      this.errorMessage = 'Select a school before managing fee structures.';
      return;
    }

    this.editingStructure = structure ? { ...structure } : null;
    this.showForm = true;
    this.errorMessage = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.editingStructure = null;
  }

  closeActionMessage(): void {
    this.actionMessage = '';
  }

  async saveStructure(submission: FeeStructureFormSubmission): Promise<void> {
    const { feeStructure, selectedGradeIds } = submission;

    if (this.editingStructure?.id) {
      this.backendService.put<FeeStructure, FeeStructure>(`fee-structure/${this.editingStructure.id}`, feeStructure).subscribe({
        next: (savedStructure) => {
          this.structures = this.structures.map(item => item.id === savedStructure.id ? savedStructure : item);
          this.closeForm();
          this.actionMessage = 'Fee structure updated successfully.';
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = error.error?.message || 'Failed to save fee structure.';
        },
      });
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    let createdCount = 0;
    const failedGrades: string[] = [];

    try {
      for (const gradeId of selectedGradeIds) {
        const grade = this.gradeOptions.find(item => item.id === gradeId);
        const registrationFee = feeStructure.term === Term.TERM_1 ? Number(feeStructure.registrationFee ?? 0) : 0;
        const examFee = this.isGrade11(grade?.name)
          ? Number(feeStructure.examFee ?? 0)
          : 0;
        const schoolFee = Number(feeStructure.schoolFee ?? 0);
        const payload: FeeStructure = {
          ...feeStructure,
          gradeId,
          gradeName: grade?.name ?? null,
          feeType: feeStructure.feeType ?? null,
          amount: Number(feeStructure.amount ?? feeStructure.totalAmount ?? 0),
          registrationFee,
          schoolFee,
          examFee,
          totalAmount: registrationFee + schoolFee + examFee,
        };

        try {
          const saved = await firstValueFrom(this.backendService.post<FeeStructure, FeeStructure>('fee-structure', payload));
          this.structures = [saved, ...this.structures.filter(item => item.id !== saved.id)];
          createdCount += 1;
        } catch (error) {
          failedGrades.push(grade?.name ?? `Grade ${gradeId}`);
          if (!this.errorMessage) {
            this.errorMessage = error instanceof HttpErrorResponse
              ? (error.error?.message || 'Failed to save some fee structures.')
              : 'Failed to save some fee structures.';
          }
        }
      }

      this.closeForm();
      if (createdCount && failedGrades.length) {
        this.actionMessage = `${createdCount} fee structure${createdCount === 1 ? '' : 's'} created. Skipped: ${failedGrades.join(', ')}.`;
      } else if (createdCount) {
        this.actionMessage = `${createdCount} fee structure${createdCount === 1 ? '' : 's'} created successfully.`;
      }
    } finally {
      this.isProcessing = false;
    }
  }

  confirmDelete(structure: FeeStructure): void {
    this.showManageDialog = false;
    this.structureToDelete = structure;
    this.showDeleteDialog = true;
  }

  cancelDelete(): void {
    this.structureToDelete = null;
    this.showDeleteDialog = false;
  }

  deleteStructure(): void {
    if (!this.structureToDelete?.id || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    this.backendService.delete<void>(`fee-structure/${this.structureToDelete.id}`).subscribe({
      next: () => {
        this.structures = this.structures.filter(structure => structure.id !== this.structureToDelete?.id);
        this.cancelDelete();
        this.actionMessage = 'Fee structure deleted successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to delete fee structure.';
      },
      complete: () => {
        this.isProcessing = false;
      },
    });
  }

  canView(row: FeeStructureRow): boolean {
    return row.primaryStructureId != null;
  }

  canManageRow(row: FeeStructureRow): boolean {
    return row.primaryStructureId != null && row.structureCount === 1;
  }

  canManageRecords(row: FeeStructureRow): boolean {
    return row.structureCount > 1;
  }

  getPrimaryStructure(row: FeeStructureRow): FeeStructure | null {
    if (row.primaryStructureId == null) {
      return null;
    }

    return this.filteredStructures.find(item => item.id === row.primaryStructureId) ?? null;
  }

  getRowStructures(row: FeeStructureRow): FeeStructure[] {
    return this.filteredStructures
      .filter(item => item.term === row.term && item.academicYear === row.academicYear)
      .sort((left, right) => {
        const gradeOrderDiff = this.getGradeOrder(left.gradeName) - this.getGradeOrder(right.gradeName);
        if (gradeOrderDiff !== 0) {
          return gradeOrderDiff;
        }

        const examDiff = Number(right.examFee ?? 0) - Number(left.examFee ?? 0);
        if (examDiff !== 0) {
          return examDiff;
        }

        const schoolDiff = Number(right.schoolFee ?? 0) - Number(left.schoolFee ?? 0);
        if (schoolDiff !== 0) {
          return schoolDiff;
        }

        return Number(left.id ?? 0) - Number(right.id ?? 0);
      });
  }

  openManageRecords(row: FeeStructureRow): void {
    this.managedRow = row;
    this.showManageDialog = true;
  }

  closeManageRecords(): void {
    this.showManageDialog = false;
    this.managedRow = null;
  }

  editManagedStructure(structure: FeeStructure): void {
    this.closeManageRecords();
    this.openForm(structure);
  }

  deleteManagedStructure(structure: FeeStructure): void {
    this.closeManageRecords();
    this.confirmDelete(structure);
  }

  viewManagedStructure(structure: FeeStructure): void {
    this.closeManageRecords();
    this.router.navigate(['/admin/fees', structure.id]);
  }

  getStructureFeeTypeLabel(structure: FeeStructure): string {
    if (Number(structure.examFee ?? 0) > 0) {
      return 'Exam Fee';
    }

    if (Number(structure.registrationFee ?? 0) > 0) {
      return 'Registration Fee';
    }

    return 'School Fees';
  }

  formatCurrencyDisplay(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  private loadData(): void {
    if (!this.selectedSchoolId) {
      this.structures = [];
      this.gradeOptions = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.backendService.get<Grade[]>('grade').subscribe({
      next: grades => {
        this.gradeOptions = (grades ?? []).filter(grade => grade.schoolId === this.selectedSchoolId);
      },
      error: () => {
        this.gradeOptions = [];
      },
    });

    this.backendService.get<FeeStructure[]>('fee-structure', { schoolId: this.selectedSchoolId }).subscribe({
      next: structures => {
        this.structures = (structures ?? []).map(structure => ({
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          feeType: structure.feeType ?? null,
          amount: Number(structure.amount ?? 0),
          examFee: Number(structure.examFee ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee structures.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private isGrade11(gradeName: string | null | undefined): boolean {
    if (!gradeName) {
      return false;
    }

    const digitsOnly = gradeName.replace(/[^0-9]/g, '');
    return digitsOnly === '11';
  }

  private get summaryTerm(): Term {
    if (this.selectedTermFilter !== 'ALL') {
      return this.selectedTermFilter;
    }

    const month = new Date().getMonth() + 1;
    if (month <= 3) {
      return Term.TERM_1;
    }
    if (month <= 6) {
      return Term.TERM_2;
    }
    if (month <= 9) {
      return Term.TERM_3;
    }
    return Term.TERM_4;
  }

  private get summaryAcademicYear(): string | null {
    const currentYear = `${new Date().getFullYear()}`;
    const years = [...new Set(this.structures.map(structure => structure.academicYear).filter(Boolean) as string[])]
      .sort((a, b) => b.localeCompare(a));

    if (years.includes(currentYear)) {
      return currentYear;
    }

    return years[0] ?? null;
  }

  private getSummaryStructures(term?: Term): FeeStructure[] {
    const academicYear = this.summaryAcademicYear;
    if (!academicYear) {
      return [];
    }

    return this.structures
      .filter(structure => structure.academicYear === academicYear)
      .filter(structure => !term || structure.term === term)
      .filter(structure => !this.selectedGradeFilter || structure.gradeId === this.selectedGradeFilter);
  }

  private get tableAcademicYear(): string {
    const filteredYears = [...new Set(this.filteredStructures.map(structure => structure.academicYear).filter(Boolean) as string[])]
      .sort((a, b) => b.localeCompare(a));

    if (filteredYears.length > 0) {
      return filteredYears[0];
    }

    return this.summaryAcademicYear ?? `${new Date().getFullYear()}`;
  }

  private formatAmountSummary(values: number[]): string {
    const uniqueValues = [...new Set(values.map(value => Number(value.toFixed(2))))].sort((a, b) => a - b);

    if (!uniqueValues.length) {
      return this.formatCurrencyDisplay(0);
    }

    if (uniqueValues.length === 1) {
      return this.formatCurrencyDisplay(uniqueValues[0]);
    }

    return `${this.formatCurrencyDisplay(uniqueValues[0])} - ${this.formatCurrencyDisplay(uniqueValues[uniqueValues.length - 1])}`;
  }

  private formatDistinctFeeValues(values: number[]): string {
    const normalizedValues = values
      .map(value => Number(value.toFixed(2)));
    const nonZeroValues = normalizedValues.filter(value => value > 0);
    const uniqueValues = [...new Set(nonZeroValues.length > 0 ? nonZeroValues : normalizedValues)];

    if (!uniqueValues.length) {
      return this.formatCurrencyDisplay(0);
    }

    return uniqueValues
      .sort((a, b) => a - b)
      .map(value => this.formatCurrencyDisplay(value))
      .join(', ');
  }

  private getRepresentativeStructure(structures: FeeStructure[]): FeeStructure | null {
    if (!structures.length) {
      return null;
    }

    return [...structures].sort((left, right) => {
      const examDiff = Number(right.examFee ?? 0) - Number(left.examFee ?? 0);
      if (examDiff !== 0) {
        return examDiff;
      }

      const schoolDiff = Number(right.schoolFee ?? 0) - Number(left.schoolFee ?? 0);
      if (schoolDiff !== 0) {
        return schoolDiff;
      }

      const registrationDiff = Number(right.registrationFee ?? 0) - Number(left.registrationFee ?? 0);
      if (registrationDiff !== 0) {
        return registrationDiff;
      }

      const grade11Priority = Number(this.isGrade11(right.gradeName)) - Number(this.isGrade11(left.gradeName));
      if (grade11Priority !== 0) {
        return grade11Priority;
      }

      return Number(left.id ?? 0) - Number(right.id ?? 0);
    })[0] ?? null;
  }

  private getTermOrder(term: Term | null): number {
    switch (term) {
      case Term.TERM_1:
        return 1;
      case Term.TERM_2:
        return 2;
      case Term.TERM_3:
        return 3;
      case Term.TERM_4:
        return 4;
      default:
        return 99;
    }
  }

  private getGradeOrder(gradeName: string | null | undefined): number {
    if (!gradeName) {
      return Number.MAX_SAFE_INTEGER;
    }

    const digitsOnly = gradeName.replace(/[^0-9]/g, '');
    return Number(digitsOnly || Number.MAX_SAFE_INTEGER);
  }
}
