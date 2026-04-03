import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FeePayment } from '../fee-payment';
import { InstallmentPlan } from '../installment-plan';
import { InstallmentSchedule } from '../installment-schedule';
import { FeeStudent } from '../fee-student';
import { FeeStructure } from '../fee-structure';
import { Term } from '../../settings/term';
import { FeeType } from '../fee-type';

@Component({
  selector: 'app-installment-plan-form',
  standalone: false,
  templateUrl: './installment-plan-form.html',
  styleUrl: './installment-plan-form.scss',
})
export class InstallmentPlanForm implements OnInit {
  @Input() plan: InstallmentPlan | null = null;
  @Input() students: FeeStudent[] = [];
  @Input() feeStructures: FeeStructure[] = [];
  @Input() payments: FeePayment[] = [];
  @Input() selectedSchoolName = '';
  @Input() parentComponent: any = null;
  @Output() save = new EventEmitter<InstallmentPlan>();
  @Output() cancel = new EventEmitter<void>();

  formPlan: Partial<InstallmentPlan> = {};
  numberOfInstallments = 2;
  installmentSchedule: Partial<InstallmentSchedule>[] = [];

  termOptions = [Term.TERM_1, Term.TERM_2, Term.TERM_3, Term.TERM_4];

  ngOnInit(): void {
    if (this.plan) {
      this.formPlan = { ...this.plan };
      this.numberOfInstallments = this.plan.installments.length;
      this.installmentSchedule = [...this.plan.installments];
    } else {
      this.resetForm();
    }
  }

  get filteredFeeStructures(): FeeStructure[] {
    if (!this.formPlan.studentId) return [];
    const student = this.students.find(s => s.id === this.formPlan.studentId);
    if (!student) return [];
    
    let filtered = this.feeStructures.filter(fs => 
      (fs.grade_id || fs.gradeId) === student.gradeId
    );
    
    if (this.formPlan.term) {
      filtered = filtered.filter(fs => fs.term === this.formPlan.term);
    }
 
    if (this.formPlan.academicYear) {
      filtered = filtered.filter(fs => 
        (fs.academic_year || fs.academicYear) === this.formPlan.academicYear
      );
    }
    
    filtered = filtered.filter(fs => {
      const totalAmount = this.calculateTotalAmount(fs);
      return totalAmount > 0;
    });
    
    return filtered;
  }

  get selectedFeeStructure(): FeeStructure | null {
    return this.feeStructures.find(fs => fs.id === this.formPlan.feeStructureId) || null;
  }

  get totalAmount(): number {
    if (!this.selectedFeeStructure) return 0;
    return this.roundAmount(this.calculateTotalAmount(this.selectedFeeStructure));
  }

  get totalPaid(): number {
    if (!this.formPlan.studentId || !this.formPlan.feeStructureId) {
      return 0;
    }

    const totalPaid = this.payments
      .filter(payment => payment.studentId === this.formPlan.studentId)
      .filter(payment => payment.feeStructureId === this.formPlan.feeStructureId)
      .filter(payment => !payment.reversed)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    return this.roundAmount(totalPaid);
  }

  get outstandingBalance(): number {
    return this.roundAmount(Math.max(0, this.totalAmount - this.totalPaid));
  }

  get plannedInstallmentTotal(): number {
    const total = this.installmentSchedule.reduce((sum, installment) => sum + Number(installment.amount ?? 0), 0);
    return this.roundAmount(total);
  }

  get remainingAfterPlan(): number {
    return this.roundAmount(Math.max(0, this.outstandingBalance - this.plannedInstallmentTotal));
  }

  get exceedsOutstandingBalance(): boolean {
    return this.plannedInstallmentTotal - this.outstandingBalance > 0.009;
  }

  calculateTotalAmount(structure: FeeStructure): number {
    if (structure.amount) {
      return structure.amount;
    }
    
    const registration = structure.registrationFee ?? structure.registration_fee ?? 0;
    const school = structure.schoolFee ?? structure.school_fee ?? 0;
    const exam = structure.examFee ?? structure.exam_fee ?? 0;
    const books = structure.booksFee ?? structure.books_fee ?? 0;
    const food = structure.foodFee ?? structure.food_fee ?? 0;
    const general = structure.generalFee ?? structure.general_fee ?? 0;
    
    return registration + school + exam + books + food + general;
  }

  onStudentChange(): void {
    const student = this.students.find(s => s.id === this.formPlan.studentId);
    if (student) {
      this.formPlan.studentName = student.userFullName || '';
      this.formPlan.studentNumber = student.studentNumber || '';
      this.formPlan.gradeId = student.gradeId || 0;
      this.formPlan.gradeName = student.gradeName || '';
    }
    this.formPlan.feeStructureId = undefined;
    this.generateInstallmentSchedule();
  }

  onFeeStructureChange(): void {
    this.generateInstallmentSchedule();
  }

  onTermOrYearChange(): void {
    this.formPlan.feeStructureId = undefined;
    this.loadFeeStructuresForForm();
    this.generateInstallmentSchedule();
  }

  private loadFeeStructuresForForm(): void {
    if (this.parentComponent && this.parentComponent.refreshFeeStructures) {
      this.parentComponent.refreshFeeStructures(this.formPlan.term, this.formPlan.academicYear);
    }
  }

  onNumberOfInstallmentsChange(): void {
    this.generateInstallmentSchedule();
  }

  generateInstallmentSchedule(): void {
    if (!this.outstandingBalance || this.numberOfInstallments < 1) {
      this.installmentSchedule = [];
      return;
    }

    const amountToSplit = this.outstandingBalance;
    const baseAmount = Math.floor((amountToSplit / this.numberOfInstallments) * 100) / 100;
    const remainder = this.roundAmount(amountToSplit - (baseAmount * this.numberOfInstallments));

    this.installmentSchedule = [];
    const today = new Date();

    for (let i = 0; i < this.numberOfInstallments; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(today.getMonth() + i + 1);

      const amount = i === this.numberOfInstallments - 1 ? this.roundAmount(baseAmount + remainder) : baseAmount;

      this.installmentSchedule.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: amount,
        paidAmount: 0,
        status: 'PENDING'
      });
    }
  }

  updateInstallmentDate(index: number, date: string): void {
    if (this.installmentSchedule[index]) {
      this.installmentSchedule[index].dueDate = date;
    }
  }

  updateInstallmentAmount(index: number, amount: number): void {
    if (this.installmentSchedule[index]) {
      this.installmentSchedule[index].amount = this.roundAmount(Number(amount ?? 0));
    }
  }

  getTermLabel(term: Term | string | null | undefined): string {
    if (!term) return '';
    
    switch (term) {
      case Term.TERM_1:
        return 'Term 1';
      case Term.TERM_2:
        return 'Term 2';
      case Term.TERM_3:
        return 'Term 3';
      case Term.TERM_4:
        return 'Term 4';
      default:
        return String(term);
    }
  }

  getFeeStructureLabel(structure: FeeStructure): string {
    const term = this.getTermLabel(structure.term);
    const year = structure.academic_year || structure.academicYear || '';
    const amount = this.calculateTotalAmount(structure);
    
    const components = [];
    if ((structure.registrationFee ?? structure.registration_fee ?? 0) > 0) components.push('Registration');
    if ((structure.schoolFee ?? structure.school_fee ?? 0) > 0) components.push('School');
    if ((structure.examFee ?? structure.exam_fee ?? 0) > 0) components.push('Exam');
    if ((structure.booksFee ?? structure.books_fee ?? 0) > 0) components.push('Books');
    if ((structure.foodFee ?? structure.food_fee ?? 0) > 0) components.push('Food');
    if ((structure.generalFee ?? structure.general_fee ?? 0) > 0) components.push('General');
    
    const feeType = components.length > 0 ? components.join('+') : 'Fee';
    
    return `${feeType} - ${term} ${year} - M${amount.toFixed(2)}`;
  }

  onSubmit(): void {
    if (!this.isFormValid()) return;

    const planToSave: InstallmentPlan = {
      ...this.formPlan as InstallmentPlan,
      totalAmount: this.plannedInstallmentTotal,
      installments: this.installmentSchedule as InstallmentSchedule[],
      status: 'ACTIVE'
    };

    this.save.emit(planToSave);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  isFormValid(): boolean {
    return !!(
      this.formPlan.studentId &&
      this.formPlan.feeStructureId &&
      this.formPlan.term &&
      this.formPlan.academicYear &&
      this.outstandingBalance > 0 &&
      this.installmentSchedule.length > 0 &&
      this.installmentSchedule.every(inst => Number(inst.amount ?? 0) > 0 && inst.dueDate) &&
      !this.exceedsOutstandingBalance
    );
  }

  private resetForm(): void {
    const currentYear = new Date().getFullYear();
    this.formPlan = {
      term: Term.TERM_1,
      academicYear: currentYear.toString(),
      status: 'ACTIVE'
    };
    this.numberOfInstallments = 2;
    this.installmentSchedule = [];
  }

  private roundAmount(value: number): number {
    return Math.round(Number(value ?? 0) * 100) / 100;
  }
}
