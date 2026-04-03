export interface AdvancedSearchCriteria {
  studentName?: string;
  studentNumber?: string;
  gradeId?: number;
  term?: string;
  academicYear?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
  referenceNumber?: string;
  includeReversed?: boolean;
}