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
      .filter(structure => structure.gradeId === selectedStudent.gradeId)
      .filter(structure => structure.schoolId === this.selectedSchoolId)
      .filter(structure => Number(structure.totalAmount ?? 0) > 0)
      .sort((left, right) => {
        const yearDiff = (right.academicYear ?? '').localeCompare(left.academicYear ?? '');
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

  get selectedFeeHelperText(): string {
    if (!this.selectedStudent) {
      return 'Select a student first to see the matching fee records.';
    }

    if (!this.availableFeeStructures.length) {
      return 'No fee records are available for the selected student grade yet.';
    }

    return 'Select the matching term fee record for this student.';
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

    if (amount - this.outstandingBalance > 0.009) {
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
    return `${this.getTermLabel(structure.term)} • ${structure.academicYear} • Total ${this.formatCurrency(structure.totalAmount ?? structure.amount ?? 0)}`;
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
