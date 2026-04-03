import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { BackendService } from '../../../util/backend.service';
import { FeeStructure } from '../fee-structure';

@Component({
  selector: 'app-fee-structure-detail',
  standalone: false,
  templateUrl: './fee-structure-detail.html',
  styleUrl: './fee-structure-detail.scss',
})
export class FeeStructureDetail implements OnInit {
  readonly feeTabs = [
    { id: 'registration', label: 'Registration Fee' },
    { id: 'school', label: 'School Fees' },
    { id: 'exam', label: 'Exam Fee' },
  ] as const;

  feeStructure: FeeStructure | null = null;
  relatedStructures: FeeStructure[] = [];
  isLoading = true;
  isSavingDates = false;
  errorMessage = '';
  actionMessage = '';
  activeTab: 'registration' | 'school' | 'exam' = 'registration';
  isEditingDates = false;
  dateForm = {
    startDate: '',
    closingDate: '',
  };

  constructor(
    private route: ActivatedRoute,
    private backendService: BackendService,
    private location: Location
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.errorMessage = 'Invalid fee structure.';
      this.isLoading = false;
      return;
    }

    this.backendService.get<FeeStructure>(`fee-structure/${id}`).subscribe({
      next: structure => {
        this.feeStructure = {
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          examFee: Number(structure.examFee ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        };
        this.syncDateForm();

        this.loadRelatedStructures(this.feeStructure.schoolId);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to load fee structure.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  getTermLabel(term: string | null | undefined): string {
    return (term ?? '').replace('_', ' ');
  }

  selectTab(tab: 'registration' | 'school' | 'exam'): void {
    this.activeTab = tab;
    this.isEditingDates = false;
    this.syncDateForm();
  }

  get activeTabLabel(): string {
    return this.feeTabs.find(tab => tab.id === this.activeTab)?.label ?? '';
  }

  get activeTabAmount(): number {
    if (!this.feeStructure) {
      return 0;
    }

    switch (this.activeTab) {
      case 'registration':
        return Number(this.feeStructure.registrationFee ?? 0);
      case 'school':
        return Number(this.feeStructure.schoolFee ?? 0);
      case 'exam':
        return Number(this.feeStructure.examFee ?? 0);
    }
  }

  get activeTabGroups(): Array<{ amount: number; grades: string }> {
    const groups = new Map<number, string[]>();

    this.structuresForCurrentContext
      .filter(structure => this.getTabAmount(structure, this.activeTab) > 0)
      .forEach(structure => {
        const amount = this.getTabAmount(structure, this.activeTab);
        const grades = groups.get(amount) ?? [];
        const gradeName = structure.gradeName?.trim();

        if (gradeName && !grades.includes(gradeName)) {
          grades.push(gradeName);
        }

        groups.set(amount, grades);
      });

    return [...groups.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([amount, grades]) => ({
        amount,
        grades: grades
          .sort((left, right) => this.getGradeOrder(left) - this.getGradeOrder(right))
          .join(', '),
      }));
  }

  get hasActiveTabGroups(): boolean {
    return this.activeTabGroups.length > 0;
  }

  get canEditDates(): boolean {
    return this.hasActiveTabGroups;
  }

  get noGradesPayingMessage(): string {
    return 'No grades are paying this fee.';
  }

  get activeTabStartDate(): string {
    return this.formatDate(this.feeStructure?.termOpeningDate ?? null);
  }

  get activeTabClosingDate(): string {
    return this.formatDate(this.feeStructure?.termClosingDate ?? null);
  }

  startEditingDates(): void {
    this.isEditingDates = true;
    this.actionMessage = '';
    this.syncDateForm();
  }

  cancelEditingDates(): void {
    this.isEditingDates = false;
    this.syncDateForm();
  }

  closeActionMessage(): void {
    this.actionMessage = '';
  }

  saveDates(): void {
    if (!this.feeStructure?.id || this.isSavingDates) {
      return;
    }

    const payload: FeeStructure = {
      ...this.feeStructure,
      termOpeningDate: this.dateForm.startDate || null,
      termClosingDate: this.dateForm.closingDate || null,
      updateTermDates: true,
    };

    this.isSavingDates = true;
    this.errorMessage = '';
    this.actionMessage = '';

    this.backendService.put<FeeStructure, FeeStructure>(`fee-structure/${this.feeStructure.id}`, payload).subscribe({
      next: structure => {
        this.feeStructure = {
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          examFee: Number(structure.examFee ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        };
        this.relatedStructures = this.relatedStructures.map(item => item.id === structure.id ? this.feeStructure! : item);
        this.isEditingDates = false;
        this.syncDateForm();
        this.actionMessage = 'Term dates updated successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.error?.message || 'Failed to save fee dates.';
      },
      complete: () => {
        this.isSavingDates = false;
      },
    });
  }

  private get structuresForCurrentContext(): FeeStructure[] {
    if (!this.feeStructure) {
      return [];
    }

    const matchingStructures = this.relatedStructures.filter(structure =>
      structure.academicYear === this.feeStructure?.academicYear
      && structure.term === this.feeStructure?.term
    );

    return matchingStructures.length ? matchingStructures : [this.feeStructure];
  }

  private syncDateForm(): void {
    this.dateForm = {
      startDate: this.feeStructure?.termOpeningDate ?? '',
      closingDate: this.feeStructure?.termClosingDate ?? '',
    };
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return 'Not set';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private loadRelatedStructures(schoolId: number | null | undefined): void {
    if (!schoolId) {
      this.relatedStructures = this.feeStructure ? [this.feeStructure] : [];
      return;
    }

    this.backendService.get<FeeStructure[]>('fee-structure', { schoolId }).subscribe({
      next: structures => {
        this.relatedStructures = (structures ?? []).map(structure => ({
          ...structure,
          registrationFee: Number(structure.registrationFee ?? 0),
          schoolFee: Number(structure.schoolFee ?? 0),
          examFee: Number(structure.examFee ?? 0),
          totalAmount: Number(structure.totalAmount ?? 0),
        }));
      },
      error: () => {
        this.relatedStructures = this.feeStructure ? [this.feeStructure] : [];
      },
    });
  }

  private getTabAmount(structure: FeeStructure, tab: 'registration' | 'school' | 'exam'): number {
    switch (tab) {
      case 'registration':
        return Number(structure.registrationFee ?? 0);
      case 'school':
        return Number(structure.schoolFee ?? 0);
      case 'exam':
        return Number(structure.examFee ?? 0);
    }
  }

  private getGradeOrder(gradeName: string): number {
    const digitsOnly = gradeName.replace(/[^0-9]/g, '');
    return Number(digitsOnly || Number.MAX_SAFE_INTEGER);
  }

  goBack(): void {
    this.location.back();
  }
}
