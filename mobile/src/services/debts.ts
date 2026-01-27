import api from './api';
import { API_ENDPOINTS } from '@/constants';

export interface Debt {
  id: string;
  family_id: string;
  creditor: string;
  description?: string;
  debt_type: 'credit_card' | 'personal_loan' | 'mortgage' | 'car_loan' | 'other';
  total_amount: number;
  current_balance: number;
  currency_code: string;
  exchange_rate_fixed: number;
  amount_in_base_currency: number;
  interest_rate?: number;
  is_archived: boolean;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  is_adjustment: boolean;
  created_at: string;
}

export interface DebtWithPayments extends Debt {
  payments: Payment[];
  total_paid: number;
}

export interface DebtSummary {
  total_debts: number;
  total_balance_mxn: number;
  by_type: Record<string, number>;
  by_currency: Record<string, number>;
}

export interface CreateDebtData {
  creditor: string;
  description?: string;
  debt_type: 'credit_card' | 'personal_loan' | 'mortgage' | 'car_loan' | 'other';
  total_amount: number;
  current_balance?: number;
  currency_code?: string;
  exchange_rate_fixed?: number;
  interest_rate?: number;
  due_date?: string;
}

export interface CreatePaymentData {
  amount: number;
  payment_date?: string;
  notes?: string;
}

// Get all debts
export const getDebts = async (includeArchived = false): Promise<Debt[]> => {
  const response = await api.get<Debt[]>(API_ENDPOINTS.DEBTS, {
    params: { include_archived: includeArchived },
  });
  return response.data;
};

// Get debt summary
export const getDebtSummary = async (): Promise<DebtSummary> => {
  const response = await api.get<DebtSummary>(API_ENDPOINTS.DEBTS_SUMMARY);
  return response.data;
};

// Get single debt with payments
export const getDebt = async (debtId: string): Promise<DebtWithPayments> => {
  const response = await api.get<DebtWithPayments>(API_ENDPOINTS.DEBT(debtId));
  return response.data;
};

// Create a new debt
export const createDebt = async (data: CreateDebtData): Promise<Debt> => {
  const response = await api.post<Debt>(API_ENDPOINTS.DEBTS, data);
  return response.data;
};

// Update a debt
export const updateDebt = async (debtId: string, data: Partial<CreateDebtData>): Promise<Debt> => {
  const response = await api.patch<Debt>(API_ENDPOINTS.DEBT(debtId), data);
  return response.data;
};

// Add payment to a debt
export const addPayment = async (
  debtId: string,
  data: CreatePaymentData
): Promise<Payment> => {
  const response = await api.post<Payment>(
    API_ENDPOINTS.DEBT_PAYMENTS(debtId),
    data
  );
  return response.data;
};

// Get payments for a debt
export const getPayments = async (
  debtId: string,
  limit = 100
): Promise<Payment[]> => {
  const response = await api.get<Payment[]>(
    API_ENDPOINTS.DEBT_PAYMENTS(debtId),
    { params: { limit } }
  );
  return response.data;
};
