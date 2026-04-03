import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FeePayment } from '../fee-payment';
import { FeeStudent } from '../fee-student';
import { FeeStructure } from '../fee-structure';
import { PaymentMethod } from '../payment-method';
import { Term } from '../../settings/term';

@Component({
  selector: 'app-fee-payment-form',
  standalone: false,
  templateUrl: './fee-payment-form.html',
  styleUrl: './fee-payment-form.scss',
})
export class FeePaymentForm implements OnInit {
  @Input() existingPayment: FeePayment | null = null;
  @Input() preferredStudentId: number | null = null;
  @Input() preferredFeeStructureId: number | null = null;
  @Input() preferredAmount: number | null = null;
  @Input() isInstallmentPayment = false;
  @Input() selectedSchoolId: number | null = null;
  @Input() selectedSchoolName = '';
  @Input() students: FeeStudent[] = [];
  @Input() feeStructures: FeeStructure[] = [];
  @Input() payments: FeePayment[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<FeePayment>();

  readonly paymentMethodOptions = [
    { value: PaymentMethod.CASH, label: 'Cash' },
    { value: PaymentMethod.BANK, label: 'Bank' },
    { value: PaymentMethod.MPESA, label: 'Mpesa' },
    { value: PaymentMethod.ECO_CASH, label: 'Eco Cash' },
  ];

  errorMessage = '';
  payment: FeePayment = {
    studentId: null,
    feeStructureId: null,
    amount: null,
    paymentDate: '',
    paymentMethod: PaymentMethod.CASH,
    referenceNumber: null,
    notes: null,
  };

  ngOnInit(): void {
    if (this.existingPayment) {
      this.payment = {
        ...this.existingPayment,
        studentId: this.existingPayment.studentId ?? null,
        feeStructureId: this.existingPayment.feeStructureId ?? null,
        amount: this.existingPayment.amount ?? null,
        paymentDate: this.existingPayment.paymentDate ?? this.today(),
        paymentMethod: this.existingPayment.paymentMethod ?? PaymentMethod.CASH,
      };
      return;
    }

    if (this.preferredStudentId) {
      this.payment.studentId = this.preferredStudentId;
      const student = this.students.find(s => s.id === this.preferredStudentId);
      this.payment.referenceNumber = student?.studentNumber ?? null;
    }

    if (this.preferredFeeStructureId) {
      this.payment.feeStructureId = this.preferredFeeStructureId;
      this.onFeeStructureChange();
    }

    if (this.preferredAmount !== null) {
      this.payment.amount = this.preferredAmount;
    }

    this.payment.paymentDate = this.today();
  }

  get isEditMode(): boolean {
    return !!this.existingPayment?.id;
  }

  get selectedStudent(): FeeStudent | null {
    return this.students.find(student => student.id === this.payment.studentId) ?? null;
  }

  get selectedFeeStructure(): FeeStructure | null {
    return this.feeStructures.find(structure => structure.id === this.payment.feeStructureId) ?? null;
  }

  get availableFeeStructures(): FeeStructure[] {
    const selectedStudent = this.selectedStudent;
    if (!selectedStudent?.gradeId) {
      return [];
    }

    return this.feeStructures
      .filter(structure => (structure.gradeId ?? structure.grade_id) === selectedStudent.gradeId)
      .filter(structure => (structure.schoolId ?? structure.school_id) === this.selectedSchoolId)
      .filter(structure => Number(structure.totalAmount ?? structure.amount ?? 0) > 0)
      .sort((left, right) => {
        const yearDiff = (right.academicYear ?? right.academic_year ?? '').localeCompare(left.academicYear ?? left.academic_year ?? '');
        if (yearDiff !== 0) {
          return yearDiff;
        }

        return this.getTermOrder(left.term) - this.getTermOrder(right.term);
      });
  }

  get selectedTotalFee(): number {
    return Number(this.selectedFeeStructure?.totalAmount ?? this.selectedFeeStructure?.amount ?? 0);
  }

  get otherPaidAmount(): number {
    if (!this.payment.studentId || !this.payment.feeStructureId) {
      return 0;
    }

    return this.payments
      .filter(payment => payment.studentId === this.payment.studentId)
      .filter(payment => payment.feeStructureId === this.payment.feeStructureId)
      .filter(payment => payment.id !== this.payment.id)
      .filter(payment => !payment.reversed) // Exclude reversed payments
      .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);
  }

  get outstandingBalance(): number {
    return Math.max(0, Number((this.selectedTotalFee - this.otherPaidAmount).toFixed(2)));
  }

  get balanceAfterPayment(): number {
    const amount = Number(this.payment.amount ?? 0);
    return Math.max(0, Number((this.outstandingBalance - amount).toFixed(2)));
  }

  get duplicatePaymentWarning(): string | null {
    if (this.isInstallmentPayment) return null;

    if (!this.payment.studentId || !this.payment.feeStructureId || !this.payment.amount || !this.payment.paymentDate) {
      return null;
    }

    const amount = Number(this.payment.amount);
    const duplicates = this.payments
      .filter(payment => payment.studentId === this.payment.studentId)
      .filter(payment => payment.feeStructureId === this.payment.feeStructureId)
      .filter(payment => payment.id !== this.payment.id)
      .filter(payment => !payment.reversed)
      .filter(payment => payment.paymentDate === this.payment.paymentDate)
      .filter(payment => Math.abs(Number(payment.amount ?? 0) - amount) < 0.01);

    if (duplicates.length > 0) {
      return `Warning: A similar payment (${this.formatCurrency(amount)}) already exists for this student on ${this.payment.paymentDate}.`;
    }

    return null;
  }

  get selectedFeeHelperText(): string {
    if (!this.selectedStudent) {
      return 'Select a student first to see the matching fee records.';
    }

    if (!this.availableFeeStructures.length) {
      return 'No fee records are available for the selected student grade yet.';
    }

    return 'Select the matching term fee record for this student.';
  }

  get minimumPaymentAmount(): number {
    return 10; // Minimum M10.00 payment
  }

  get maximumSinglePayment(): number {
    return 10000; // Maximum M10,000.00 single payment
  }

  onStudentChange(): void {
    this.errorMessage = '';
    this.payment.feeStructureId = null;
    this.payment.amount = null;
  }

  onFeeStructureChange(): void {
    this.errorMessage = '';

    if (!this.selectedFeeStructure || this.isEditMode) {
      return;
    }

    this.payment.amount = this.outstandingBalance > 0 ? this.outstandingBalance : null;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.selectedSchoolId) {
      this.errorMessage = 'Please select a school from the top header first.';
      return;
    }

    if (!this.payment.studentId) {
      this.errorMessage = 'Student is required.';
      return;
    }

    if (!this.payment.feeStructureId) {
      this.errorMessage = 'Fee record is required.';
      return;
    }

    const amount = Number(this.payment.amount ?? 0);
    if (amount <= 0) {
      this.errorMessage = 'Amount must be greater than zero.';
      return;
    }

    if (!this.isInstallmentPayment && amount < this.minimumPaymentAmount) {
      this.errorMessage = `Amount must be at least ${this.formatCurrency(this.minimumPaymentAmount)}.`;
      return;
    }

    if (amount > this.maximumSinglePayment) {
      this.errorMessage = `Amount cannot exceed ${this.formatCurrency(this.maximumSinglePayment)} for a single payment.`;
      return;
    }

    if (!this.isInstallmentPayment && amount - this.outstandingBalance > 0.009) {
      this.errorMessage = 'Amount cannot be greater than the outstanding balance.';
      return;
    }

    if (!this.payment.paymentDate) {
      this.errorMessage = 'Payment date is required.';
      return;
    }

    if (this.payment.paymentDate > this.today()) {
      this.errorMessage = 'Payment date cannot be in the future.';
      return;
    }

    // Check for potential duplicates
    const duplicateWarning = this.duplicatePaymentWarning;
    if (duplicateWarning && !this.isEditMode) {
      this.errorMessage = duplicateWarning + ' Please verify this is not a duplicate payment.';
      return;
    }

    if (!this.payment.paymentMethod) {
      this.errorMessage = 'Payment method is required.';
      return;
    }

    this.saved.emit({
      ...this.payment,
      studentId: this.payment.studentId,
      studentName: this.selectedStudent?.userFullName ?? null,
      studentNumber: this.selectedStudent?.studentNumber ?? null,
      feeStructureId: this.payment.feeStructureId,
      gradeId: this.selectedStudent?.gradeId ?? null,
      gradeName: this.selectedStudent?.gradeName ?? null,
      term: this.selectedFeeStructure?.term ?? null,
      academicYear: this.selectedFeeStructure?.academicYear ?? null,
      amount,
      paymentDate: this.payment.paymentDate,
      paymentMethod: this.payment.paymentMethod,
      referenceNumber: this.nullIfBlank(this.payment.referenceNumber),
      notes: this.nullIfBlank(this.payment.notes),
      totalFee: this.selectedTotalFee,
      totalPaid: this.otherPaidAmount + amount,
      balance: this.balanceAfterPayment,
    });
  }

  close(): void {
    this.closed.emit();
  }

  getStructureLabel(structure: FeeStructure): string {
    const term = this.getTermLabel(structure.term);
    const year = structure.academicYear ?? structure.academic_year ?? '';
    const total = structure.totalAmount ?? structure.amount ?? 0;
    return `${term} • ${year} • Total ${this.formatCurrency(total)}`;
  }

  formatCurrency(value: number | null | undefined): string {
    return `M${Number(value ?? 0).toFixed(2)}`;
  }

  private getTermLabel(term: Term | string | null | undefined): string {
    return String(term ?? '').replace('_', ' ');
  }

  private getTermOrder(term: Term | null | undefined): number {
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

  private nullIfBlank(value?: string | null): string | null {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
