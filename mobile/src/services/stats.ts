import api from './api';
import { API_ENDPOINTS } from '@/constants';
import type { DashboardData, FinancialSummary } from '@/types';

export interface SummaryFilters {
  date_from?: string;
  date_to?: string;
}

// Get financial summary
export const getSummary = async (filters: SummaryFilters = {}): Promise<FinancialSummary> => {
  const params = new URLSearchParams();

  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);

  const queryString = params.toString();
  const url = queryString
    ? `${API_ENDPOINTS.STATS_SUMMARY}?${queryString}`
    : API_ENDPOINTS.STATS_SUMMARY;

  const response = await api.get<FinancialSummary>(url);
  return response.data;
};

// Get dashboard data
export const getDashboard = async (): Promise<DashboardData> => {
  const response = await api.get<DashboardData>(API_ENDPOINTS.STATS_DASHBOARD);
  return response.data;
};
