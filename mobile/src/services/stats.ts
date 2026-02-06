import api from './api';
import { API_ENDPOINTS } from '@/constants';
import type { DashboardData, FinancialSummary, ReportsData } from '@/types';

export interface SummaryFilters {
  date_from?: string;
  date_to?: string;
}

export interface ReportsFilters {
  date_from?: string;
  date_to?: string;
  category_id?: number;
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

// Get reports data with filters
export const getReports = async (filters: ReportsFilters = {}): Promise<ReportsData> => {
  const params = new URLSearchParams();

  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.category_id) params.append('category_id', filters.category_id.toString());

  const queryString = params.toString();
  const url = queryString
    ? `${API_ENDPOINTS.STATS_REPORTS}?${queryString}`
    : API_ENDPOINTS.STATS_REPORTS;

  const response = await api.get<ReportsData>(url);
  return response.data;
};
