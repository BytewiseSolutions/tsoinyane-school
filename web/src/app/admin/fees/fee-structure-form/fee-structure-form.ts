import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Grade } from '../../grades/grade';
import { Term } from '../../settings/term';
import { FeeStructure } from '../fee-structure';
import { FeeStructureFormSubmission } from '../fee-structure-form-submission';
import { FeeType } from '../fee-type';

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
  readonly feeTypeOptions: Array<{ value: FeeType; label: string }> = [
    { value: FeeType.REGISTRATION_FEE, label: 'Registration Fee' },
    { value: FeeType.SCHOOL_FEES, label: 'School Fees' },
    { value: FeeType.EXAM_FEE, label: 'Exam Fee' },
  ];

  feeStructure: FeeStructure = {
    schoolId: null,
    gradeId: null,
    term: Term.TERM_1,
    academicYear: '',
    registrationFee: 0,
    schoolFee: 0,
    examFee: 0,
  };
  selectedGradeIds: number[] = [];
  selectedFeeType: FeeType = FeeType.REGISTRATION_FEE;
  amount = 0;

  get visibleGradeOptions(): Grade[] {
    return [...this.gradeOptions].sort((left, right) => this.getGradeOrder(left) - this.getGradeOrder(right));
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
      this.initializeFeeTypeAndAmount();
      return;
    }

    this.feeStructure.schoolId = this.selectedSchoolId;
    this.feeStructure.schoolName = this.selectedSchoolName || null;
  }

  get totalAmount(): number {
    return Number(this.amount ?? 0);
  }

  getTermLabel(term: Term | null | undefined): string {
    return (term ?? '').replace('_', ' ');
  }

  get isEditMode(): boolean {
    return !!this.existingStructure?.id;
  }

  get feeTypeHelperText(): string {
    switch (this.selectedFeeType) {
      case FeeType.REGISTRATION_FEE:
        return 'This amount will apply to the grades you select below.';
      case FeeType.SCHOOL_FEES:
        return 'This amount will apply to the grades you select below.';
      case FeeType.EXAM_FEE:
        return 'This amount applies to Grade 11 only. Grade 11 is selected automatically.';
      default:
        return '';
    }
  }

  selectFeeType(feeType: FeeType): void {
    this.selectedFeeType = feeType;
    this.onFeeTypeChange();
  }

  onFeeTypeChange(): void {
    if (this.selectedFeeType === FeeType.EXAM_FEE) {
      this.selectedGradeIds = this.gradeOptions
        .filter(grade => this.isGrade11(grade))
        .map(grade => grade.id ?? 0)
        .filter(id => id > 0);
    }
  }

  isGradeSelected(gradeId: number | null | undefined): boolean {
    return gradeId != null && this.selectedGradeIds.includes(gradeId);
  }

  onGradeToggle(gradeId: number | null | undefined, checked: boolean): void {
    if (gradeId == null) {
      return;
    }

    const grade = this.gradeOptions.find(item => item.id === gradeId);
    if (this.selectedFeeType === FeeType.EXAM_FEE && !this.isGrade11(grade)) {
      return;
    }

    if (checked) {
      if (!this.selectedGradeIds.includes(gradeId)) {
        if (this.isEditMode) {
          this.selectedGradeIds = [gradeId];
        } else {
          this.selectedGradeIds = [...this.selectedGradeIds, gradeId];
        }
      }
      return;
    }

    this.selectedGradeIds = this.selectedGradeIds.filter(id => id !== gradeId);
  }

  isGradeDisabled(grade: Grade): boolean {
    return this.selectedFeeType === FeeType.EXAM_FEE;
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
    const normalizedAmount = Number(this.amount ?? 0);

    let registrationFee = 0;
    let schoolFee = 0;
    let examFee = 0;
    if (this.selectedFeeType === FeeType.REGISTRATION_FEE) {
      registrationFee = normalizedAmount;
    } else if (this.selectedFeeType === FeeType.SCHOOL_FEES) {
      schoolFee = normalizedAmount;
    } else if (this.selectedFeeType === FeeType.EXAM_FEE) {
      examFee = normalizedAmount;
    }

    this.saved.emit({
      feeStructure: {
        ...this.feeStructure,
        schoolId: this.selectedSchoolId,
        schoolName: this.selectedSchoolName || null,
        gradeId: primaryGradeId,
        gradeName: selectedGrade?.name ?? null,
        academicYear,
        feeType: this.selectedFeeType,
        amount: normalizedAmount,
        registrationFee,
        schoolFee,
        examFee,
        totalAmount: this.totalAmount,
      },
      selectedGradeIds: [...this.selectedGradeIds],
    });
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  private initializeFeeTypeAndAmount(): void {
    const registrationFee = Number(this.feeStructure.registrationFee ?? 0);
    const schoolFee = Number(this.feeStructure.schoolFee ?? 0);
    const examFee = Number(this.feeStructure.examFee ?? 0);

    if (registrationFee > 0) {
      this.selectedFeeType = FeeType.REGISTRATION_FEE;
      this.amount = registrationFee;
      return;
    }

    if (examFee > 0) {
      this.selectedFeeType = FeeType.EXAM_FEE;
      this.amount = examFee;
      return;
    }

    this.selectedFeeType = FeeType.SCHOOL_FEES;
    this.amount = schoolFee;
  }

  private isGrade11(grade: Grade | undefined): boolean {
    if (!grade?.name) {
      return false;
    }

    const digitsOnly = grade.name.replace(/[^0-9]/g, '');
    return digitsOnly === '11';
  }

  private getGradeOrder(grade: Grade): number {
    const digitsOnly = grade.name?.replace(/[^0-9]/g, '') ?? '';
    return Number(digitsOnly || Number.MAX_SAFE_INTEGER);
  }
}
