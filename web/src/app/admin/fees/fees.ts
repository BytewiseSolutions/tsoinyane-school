import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { Grade } from '../grades/grade';
import { SchoolContextService } from '../layout/school-context';
import { Term } from '../settings/term';
import { FeeStructure } from './fee-structure';
import { FeeStructureFormSubmission } from './fee-structure-form-submission';

interface FeeStructureRow {
  structureIds: number[];
  primaryStructureId: number | null;
  term: Term | null;
  academicYear: string;
  gradeLabel: string;
  registrationFee: number;
  schoolFee: number;
  examFee: number;
  canEdit: boolean;
  canDelete: boolean;
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

  constructor(
    private backendService: BackendService,
    private schoolContext: SchoolContextService
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
          || structure.academicYear.toLowerCase().includes(query)
          || (structure.description ?? '').toLowerCase().includes(query);
      });
  }

  get filteredRows(): FeeStructureRow[] {
    const groupedRows = new Map<string, FeeStructure[]>();

    for (const structure of this.filteredStructures) {
      const key = [
        structure.term ?? '',
        structure.academicYear,
        Number(structure.registrationFee ?? 0).toFixed(2),
        Number(structure.schoolFee ?? 0).toFixed(2),
        Number(structure.examFee ?? 0).toFixed(2),
      ].join('|');

      const existing = groupedRows.get(key) ?? [];
      existing.push(structure);
      groupedRows.set(key, existing);
    }

    return Array.from(groupedRows.values())
      .map(group => {
        const sortedGroup = [...group].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
        const structureIds = sortedGroup
          .map(item => item.id ?? null)
          .filter((id): id is number => id != null);

        return {
          structureIds,
          primaryStructureId: structureIds[0] ?? null,
          term: sortedGroup[0]?.term ?? null,
          academicYear: sortedGroup[0]?.academicYear ?? '',
          gradeLabel: this.getGradeLabel(sortedGroup),
          registrationFee: Number(sortedGroup[0]?.registrationFee ?? 0),
          schoolFee: Number(sortedGroup[0]?.schoolFee ?? 0),
          examFee: Number(sortedGroup[0]?.examFee ?? 0),
          canEdit: sortedGroup.length === 1,
          canDelete: sortedGroup.length === 1,
        };
      })
      .sort((a, b) => {
        if (a.academicYear !== b.academicYear) {
          return b.academicYear.localeCompare(a.academicYear);
        }

        const termDiff = this.getTermOrder(a.term) - this.getTermOrder(b.term);
        if (termDiff !== 0) {
          return termDiff;
        }

        return a.gradeLabel.localeCompare(b.gradeLabel);
      });
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
        const examFee = feeStructure.term === Term.TERM_2 && this.isGrade11(grade?.name)
          ? Number(feeStructure.examFee ?? 0)
          : 0;
        const foodFee = Number(feeStructure.foodFee ?? 0);
        const booksFee = Number(feeStructure.booksFee ?? 0);
        const generalFee = Number(feeStructure.generalFee ?? 0);
        const schoolFee = foodFee + booksFee + generalFee;
        const payload: FeeStructure = {
          ...feeStructure,
          gradeId,
          gradeName: grade?.name ?? null,
          registrationFee,
          schoolFee,
          foodFee,
          booksFee,
          generalFee,
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
    return row.canEdit && row.primaryStructureId != null;
  }

  getPrimaryStructure(row: FeeStructureRow): FeeStructure | null {
    if (row.primaryStructureId == null) {
      return null;
    }

    return this.filteredStructures.find(item => item.id === row.primaryStructureId) ?? null;
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
          foodFee: Number(structure.foodFee ?? 0),
          booksFee: Number(structure.booksFee ?? 0),
          generalFee: Number(structure.generalFee ?? 0),
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
    const years = [...new Set(this.structures.map(structure => structure.academicYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));

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

  private formatAmountSummary(values: number[]): string {
    const uniqueValues = [...new Set(values.map(value => Number(value.toFixed(2))))].sort((a, b) => a - b);

    if (!uniqueValues.length) {
      return '0.00';
    }

    if (uniqueValues.length === 1) {
      return uniqueValues[0].toFixed(2);
    }

    return `${uniqueValues[0].toFixed(2)} - ${uniqueValues[uniqueValues.length - 1].toFixed(2)}`;
  }

  private getGradeLabel(group: FeeStructure[]): string {
    const groupGradeIds = [...new Set(group.map(item => item.gradeId).filter((id): id is number => id != null))].sort((a, b) => a - b);
    const allGradeIds = this.gradeOptions
      .map(grade => grade.id ?? 0)
      .filter(id => id > 0)
      .sort((a, b) => a - b);

    const otherGradeIds = this.gradeOptions
      .filter(grade => !this.isGrade11(grade.name))
      .map(grade => grade.id ?? 0)
      .filter(id => id > 0)
      .sort((a, b) => a - b);

    if (this.sameIds(groupGradeIds, allGradeIds) && allGradeIds.length > 0) {
      return 'All Grades';
    }

    if (this.sameIds(groupGradeIds, otherGradeIds) && otherGradeIds.length > 0) {
      return 'Other Grades';
    }

    if (group.length === 1) {
      return group[0].gradeName || 'N/A';
    }

    return group
      .map(item => item.gradeName || 'N/A')
      .filter((value, index, array) => array.indexOf(value) === index)
      .join(', ');
  }

  private sameIds(left: number[], right: number[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
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
}
