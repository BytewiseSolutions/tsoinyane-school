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
    foodFee: 0,
    booksFee: 0,
    generalFee: 0,
    examFee: 0,
    description: null,
  };
  selectedGradeIds: number[] = [];
  selectedFeeType: FeeType = FeeType.REGISTRATION_FEE;
  amount = 0;

  ngOnInit(): void {
    if (this.existingStructure) {
      this.feeStructure = {
        ...this.existingStructure,
        registrationFee: this.existingStructure.registrationFee ?? 0,
        schoolFee: this.existingStructure.schoolFee ?? 0,
        foodFee: this.existingStructure.foodFee ?? 0,
        booksFee: this.existingStructure.booksFee ?? 0,
        generalFee: this.existingStructure.generalFee ?? 0,
        examFee: this.existingStructure.examFee ?? 0,
      };
      this.selectedGradeIds = this.existingStructure.gradeId ? [this.existingStructure.gradeId] : [];
      this.initializeFeeTypeAndAmount();
      return;
    }

    this.feeStructure.schoolId = this.selectedSchoolId;
    this.feeStructure.schoolName = this.selectedSchoolName || null;
    this.syncSelectedGradeIds();
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
        return 'This will apply to all grades.';
      case FeeType.SCHOOL_FEES:
        return 'This will apply to all grades.';
      case FeeType.EXAM_FEE:
        return 'This will apply to Grade 11 only.';
      default:
        return '';
    }
  }

  onFeeTypeChange(): void {
    this.syncSelectedGradeIds();
  }

  onSubmit(): void {
    const academicYear = this.feeStructure.academicYear.trim();
    this.syncSelectedGradeIds();

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
    let foodFee = 0;
    let booksFee = 0;
    let generalFee = 0;

    if (this.selectedFeeType === FeeType.REGISTRATION_FEE) {
      registrationFee = normalizedAmount;
    } else if (this.selectedFeeType === FeeType.SCHOOL_FEES) {
      schoolFee = normalizedAmount;
      generalFee = normalizedAmount;
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
        registrationFee,
        schoolFee,
        foodFee,
        booksFee,
        generalFee,
        examFee,
        totalAmount: this.totalAmount,
        description: null,
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

  private syncSelectedGradeIds(): void {
    if (this.isEditMode) {
      this.selectedGradeIds = this.existingStructure?.gradeId ? [this.existingStructure.gradeId] : [];
      return;
    }

    if (this.selectedFeeType === FeeType.EXAM_FEE) {
      this.selectedGradeIds = this.gradeOptions
        .filter(grade => this.isGrade11(grade))
        .map(grade => grade.id ?? 0)
        .filter(id => id > 0);
      return;
    }

    this.selectedGradeIds = this.gradeOptions
      .map(grade => grade.id ?? 0)
      .filter(id => id > 0);
  }

  private isGrade11(grade: Grade | undefined): boolean {
    if (!grade?.name) {
      return false;
    }

    const digitsOnly = grade.name.replace(/[^0-9]/g, '');
    return digitsOnly === '11';
  }
}
