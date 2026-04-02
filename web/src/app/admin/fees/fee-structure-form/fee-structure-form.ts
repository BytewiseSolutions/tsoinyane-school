import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Grade } from '../../grades/grade';
import { Term } from '../../settings/term';
import { FeeStructure } from '../fee-structure';
import { FeeStructureFormSubmission } from '../fee-structure-form-submission';

const SELECT_ALL_GRADES_ID = -1;

@Component({
  selector: 'app-fee-structure-form',
  standalone: false,
  templateUrl: './fee-structure-form.html',
  styleUrl: './fee-structure-form.scss',
})
export class FeeStructureForm implements OnInit {
  @Input() existingStructure: FeeStructure | null = null;
  @Input() selectedSchoolId: number | null = null;
  @Input() selectedSchoolName = '';
  @Input() gradeOptions: Grade[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<FeeStructureFormSubmission>();

  readonly termOptions = [Term.TERM_1, Term.TERM_2, Term.TERM_3, Term.TERM_4];

  feeStructure: FeeStructure = {
    schoolId: null,
    gradeId: null,
    term: Term.TERM_1,
    academicYear: '',
    registrationFee: 0,
    schoolFee: 0,
    examFee: 0,
    description: '',
  };
  selectedGradeIds: number[] = [];

  get gradeSelectionOptions(): Array<{ id: number; name: string }> {
    return [
      { id: SELECT_ALL_GRADES_ID, name: 'All Grades' },
      ...this.gradeOptions.map(grade => ({
        id: grade.id ?? 0,
        name: grade.name,
      })).filter(grade => grade.id > 0),
    ];
  }

  ngOnInit(): void {
    if (this.existingStructure) {
      this.feeStructure = {
        ...this.existingStructure,
        registrationFee: this.existingStructure.registrationFee ?? 0,
        schoolFee: this.existingStructure.schoolFee ?? 0,
        examFee: this.existingStructure.examFee ?? 0,
      };
      this.selectedGradeIds = this.existingStructure.gradeId ? [this.existingStructure.gradeId] : [];
      return;
    }

    this.feeStructure.schoolId = this.selectedSchoolId;
    this.feeStructure.schoolName = this.selectedSchoolName || null;
  }

  get totalAmount(): number {
    return (this.feeStructure.registrationFee ?? 0)
      + (this.feeStructure.schoolFee ?? 0)
      + (this.feeStructure.examFee ?? 0);
  }

  getTermLabel(term: Term | null | undefined): string {
    return (term ?? '').replace('_', ' ');
  }

  get isEditMode(): boolean {
    return !!this.existingStructure?.id;
  }

  onGradeSelectionChange(selectedIds: number[] | null): void {
    const ids = selectedIds ?? [];

    if (this.isEditMode) {
      this.selectedGradeIds = ids;
      this.feeStructure.gradeId = ids[0] ?? null;
      return;
    }

    if (ids.includes(SELECT_ALL_GRADES_ID)) {
      this.selectedGradeIds = this.gradeOptions
        .map(grade => grade.id ?? 0)
        .filter(id => id > 0);
    } else {
      this.selectedGradeIds = ids.filter(id => id > 0);
    }
  }

  get selectedGradesLabel(): string {
    if (!this.selectedGradeIds.length) {
      return 'No grades selected';
    }

    if (this.selectedGradeIds.length === this.gradeOptions.length) {
      return 'All grades selected';
    }

    return `${this.selectedGradeIds.length} grade${this.selectedGradeIds.length === 1 ? '' : 's'} selected`;
  }

  onSubmit(): void {
    const academicYear = this.feeStructure.academicYear.trim();

    if (!this.selectedSchoolId || !this.selectedGradeIds.length || !this.feeStructure.term || !academicYear) {
      return;
    }

    const primaryGradeId = this.isEditMode
      ? (this.selectedGradeIds[0] ?? null)
      : (this.selectedGradeIds[0] ?? null);
    const selectedGrade = this.gradeOptions.find(grade => grade.id === primaryGradeId);

    this.saved.emit({
      feeStructure: {
        ...this.feeStructure,
        schoolId: this.selectedSchoolId,
        schoolName: this.selectedSchoolName || null,
        gradeId: primaryGradeId,
        gradeName: selectedGrade?.name ?? null,
        academicYear,
        registrationFee: Number(this.feeStructure.registrationFee ?? 0),
        schoolFee: Number(this.feeStructure.schoolFee ?? 0),
        examFee: Number(this.feeStructure.examFee ?? 0),
        totalAmount: this.totalAmount,
        description: this.feeStructure.description?.trim() || null,
      },
      selectedGradeIds: [...this.selectedGradeIds],
    });
    this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
