import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import { BackendService } from '../../util/backend.service';
import { Grade } from '../grades/grade';
import { SchoolContextService } from '../layout/school-context';
import { Term } from '../settings/term';
import { FeeStructure } from './fee-structure';
import { FeeStructureFormSubmission } from './fee-structure-form-submission';

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

  get totalStructures(): number {
    return this.structures.length;
  }

  get totalRegistrationFees(): number {
    return this.structures.reduce((sum, structure) => sum + Number(structure.registrationFee ?? 0), 0);
  }

  get totalSchoolFees(): number {
    return this.structures.reduce((sum, structure) => sum + Number(structure.schoolFee ?? 0), 0);
  }

  get totalExamFees(): number {
    return this.structures.reduce((sum, structure) => sum + Number(structure.examFee ?? 0), 0);
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
        const payload: FeeStructure = {
          ...feeStructure,
          gradeId,
          gradeName: grade?.name ?? null,
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
}
