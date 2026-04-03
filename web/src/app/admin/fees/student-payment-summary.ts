export interface StudentPaymentTermSummary {
  term: string;
  academicYear: string;
  totalFee: number;
  totalPaid: number;
  balance: number;
  status: string;
  paymentCount: number;
}

export interface StudentPaymentSummary {
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeId: number;
  gradeName: string;
  totalFeesAcrossAllTerms: number;
  totalPaidAcrossAllTerms: number;
  totalOutstandingAcrossAllTerms: number;
  termSummaries: StudentPaymentTermSummary[];
}
