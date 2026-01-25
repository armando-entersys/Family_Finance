import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as statsService from '@/services/stats';

// Dashboard data hook
export const useDashboard = () => {
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: () => statsService.getDashboard(),
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
};

// Financial summary hook with date filters
export const useSummary = (filters?: { date_from?: string; date_to?: string }) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.STATS, filters],
    queryFn: () => statsService.getSummary(filters),
    staleTime: 60000,
  });
};
