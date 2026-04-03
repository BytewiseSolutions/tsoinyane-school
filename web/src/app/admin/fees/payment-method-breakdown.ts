import { PaymentMethod } from './payment-method';

export interface PaymentMethodBreakdown {
  paymentMethod: PaymentMethod;
  totalAmount: number;
  paymentCount: number;
  averageAmount: number;
  percentageOfTotal: number;
}
