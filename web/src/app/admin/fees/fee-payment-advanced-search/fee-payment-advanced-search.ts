import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Grade } from '../../grades/grade';
import { AdvancedSearchCriteria } from '../advanced-search-criteria';

@Component({
  selector: 'app-fee-payment-advanced-search',
  standalone: false,
  templateUrl: './fee-payment-advanced-search.html',
  styleUrl: './fee-payment-advanced-search.scss',
})
export class FeePaymentAdvancedSearch implements OnInit {
  @Input() gradeOptions: Grade[] = [];
  @Input() initialCriteria: AdvancedSearchCriteria | null = null;
  @Output() searchChanged = new EventEmitter<AdvancedSearchCriteria>();
  @Output() closed = new EventEmitter<void>();

  criteria: AdvancedSearchCriteria = {
    includeReversed: false
  };

  ngOnInit(): void {
    this.criteria = {
      includeReversed: false,
      ...(this.initialCriteria ?? {}),
    };
  }

  readonly paymentMethodOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK', label: 'Bank' },
    { value: 'MPESA', label: 'Mpesa' },
    { value: 'ECO_CASH', label: 'Eco Cash' },
  ];

  readonly termOptions = [
    { value: 'TERM_1', label: 'TERM 1' },
    { value: 'TERM_2', label: 'TERM 2' },
    { value: 'TERM_3', label: 'TERM 3' },
    { value: 'TERM_4', label: 'TERM 4' },
  ];

  onSearch(): void {
    // Clean up empty values
    const cleanCriteria: AdvancedSearchCriteria = {};
    
    if (this.criteria.studentName?.trim()) {
      cleanCriteria.studentName = this.criteria.studentName.trim();
    }
    if (this.criteria.studentNumber?.trim()) {
      cleanCriteria.studentNumber = this.criteria.studentNumber.trim();
    }
    if (this.criteria.gradeId) {
      cleanCriteria.gradeId = this.criteria.gradeId;
    }
    if (this.criteria.term) {
      cleanCriteria.term = this.criteria.term;
    }
    if (this.criteria.academicYear?.trim()) {
      cleanCriteria.academicYear = this.criteria.academicYear.trim();
    }
    if (this.criteria.paymentMethod) {
      cleanCriteria.paymentMethod = this.criteria.paymentMethod;
    }
    if (this.criteria.dateFrom) {
      cleanCriteria.dateFrom = this.criteria.dateFrom;
    }
    if (this.criteria.dateTo) {
      cleanCriteria.dateTo = this.criteria.dateTo;
    }
    if (this.criteria.amountFrom && this.criteria.amountFrom > 0) {
      cleanCriteria.amountFrom = this.criteria.amountFrom;
    }
    if (this.criteria.amountTo && this.criteria.amountTo > 0) {
      cleanCriteria.amountTo = this.criteria.amountTo;
    }
    if (this.criteria.referenceNumber?.trim()) {
      cleanCriteria.referenceNumber = this.criteria.referenceNumber.trim();
    }
    if (this.criteria.includeReversed) {
      cleanCriteria.includeReversed = this.criteria.includeReversed;
    }

    this.searchChanged.emit(cleanCriteria);
  }

  onClear(): void {
    this.criteria = { includeReversed: false };
    this.searchChanged.emit({});
  }

  onClose(): void {
    this.closed.emit();
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
