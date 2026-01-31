import api from './api';
import { API_ENDPOINTS } from '@/constants';

export interface CategoryBudget {
  id: string;
  family_id: string;
  category_id: number;
  budget_amount: number;
  currency_code: string;
  period: BudgetPeriod;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY';

export interface CategoryBudgetStatus {
  id: string;
  family_id: string;
  category_id: number;
  category_name: string | null;
  budget_amount: number;
  currency_code: string;
  period: string;
  alert_threshold: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  is_over_budget: boolean;
  is_alert_triggered: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryBudgetData {
  category_id: number;
  budget_amount: number;
  currency_code?: string;
  period?: BudgetPeriod;
  alert_threshold?: number;
}

export interface UpdateCategoryBudgetData {
  budget_amount?: number;
  currency_code?: string;
  period?: BudgetPeriod;
  alert_threshold?: number;
}

export async function getCategoryBudgets(): Promise<CategoryBudget[]> {
  const response = await api.get<CategoryBudget[]>(API_ENDPOINTS.CATEGORY_BUDGETS);
  return response.data;
}

export async function getCategoryBudgetsStatus(): Promise<CategoryBudgetStatus[]> {
  const response = await api.get<CategoryBudgetStatus[]>(API_ENDPOINTS.CATEGORY_BUDGETS_STATUS);
  return response.data;
}

export async function getCategoryBudget(id: string): Promise<CategoryBudget> {
  const response = await api.get<CategoryBudget>(API_ENDPOINTS.CATEGORY_BUDGET(id));
  return response.data;
}

export async function createCategoryBudget(data: CreateCategoryBudgetData): Promise<CategoryBudget> {
  const response = await api.post<CategoryBudget>(API_ENDPOINTS.CATEGORY_BUDGETS, data);
  return response.data;
}

export async function updateCategoryBudget(
  id: string,
  data: UpdateCategoryBudgetData
): Promise<CategoryBudget> {
  const response = await api.patch<CategoryBudget>(API_ENDPOINTS.CATEGORY_BUDGET(id), data);
  return response.data;
}

export async function deleteCategoryBudget(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.CATEGORY_BUDGET(id));
}
