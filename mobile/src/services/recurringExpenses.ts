import { apiClient } from './api';
import { API_ENDPOINTS } from '@/constants';

export interface RecurringExpense {
  id: string;
  family_id: string;
  category_id: number | null;
  name: string;
  description: string | null;
  amount: number;
  currency_code: string;
  frequency: FrequencyType;
  next_due_date: string;
  last_executed_date: string | null;
  is_automatic: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type FrequencyType = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface CreateRecurringExpenseData {
  name: string;
  description?: string;
  category_id?: number;
  amount: number;
  currency_code?: string;
  frequency: FrequencyType;
  next_due_date: string;
  is_automatic?: boolean;
}

export interface UpdateRecurringExpenseData {
  name?: string;
  description?: string;
  category_id?: number | null;
  amount?: number;
  currency_code?: string;
  frequency?: FrequencyType;
  next_due_date?: string;
  is_automatic?: boolean;
  is_active?: boolean;
}

export interface ExecuteRecurringExpenseData {
  description?: string;
  execution_date?: string;
}

export async function getRecurringExpenses(includeInactive = false): Promise<RecurringExpense[]> {
  const response = await apiClient.get<RecurringExpense[]>(
    `${API_ENDPOINTS.RECURRING_EXPENSES}?include_inactive=${includeInactive}`
  );
  return response.data;
}

export async function getDueExpenses(): Promise<RecurringExpense[]> {
  const response = await apiClient.get<RecurringExpense[]>(API_ENDPOINTS.RECURRING_EXPENSES_DUE);
  return response.data;
}

export async function getRecurringExpense(id: string): Promise<RecurringExpense> {
  const response = await apiClient.get<RecurringExpense>(API_ENDPOINTS.RECURRING_EXPENSE(id));
  return response.data;
}

export async function createRecurringExpense(data: CreateRecurringExpenseData): Promise<RecurringExpense> {
  const response = await apiClient.post<RecurringExpense>(API_ENDPOINTS.RECURRING_EXPENSES, data);
  return response.data;
}

export async function updateRecurringExpense(
  id: string,
  data: UpdateRecurringExpenseData
): Promise<RecurringExpense> {
  const response = await apiClient.patch<RecurringExpense>(API_ENDPOINTS.RECURRING_EXPENSE(id), data);
  return response.data;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.RECURRING_EXPENSE(id));
}

export async function executeRecurringExpense(
  id: string,
  data?: ExecuteRecurringExpenseData
): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.RECURRING_EXPENSE_EXECUTE(id), data || {});
  return response.data;
}
