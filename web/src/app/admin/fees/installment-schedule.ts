export interface InstallmentSchedule {
  id?: number;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}