import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as debtsService from '@/services/debts';
import type { CreateDebtData, CreatePaymentData } from '@/services/debts';

// List all debts
export const useDebts = (includeArchived = false) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.DEBTS, { includeArchived }],
    queryFn: () => debtsService.getDebts(includeArchived),
  });
};

// Get debt summary
export const useDebtSummary = () => {
  return useQuery({
    queryKey: ['debts', 'summary'],
    queryFn: () => debtsService.getDebtSummary(),
  });
};

// Alias for backward compatibility
export const useDebtsSummary = useDebtSummary;

// Get single debt with payments
export const useDebt = (debtId: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.DEBT(debtId || ''),
    queryFn: () => debtsService.getDebt(debtId!),
    enabled: !!debtId,
  });
};

// Create debt mutation
export const useCreateDebt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDebtData) => debtsService.createDebt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
      queryClient.invalidateQueries({ queryKey: ['debts', 'summary'] });
    },
  });
};

// Update debt mutation
export const useUpdateDebt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ debtId, data }: { debtId: string; data: Partial<CreateDebtData> }) =>
      debtsService.updateDebt(debtId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBT(variables.debtId) });
      queryClient.invalidateQueries({ queryKey: ['debts', 'summary'] });
    },
  });
};

// Add payment mutation
export const useAddPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ debtId, data }: { debtId: string; data: CreatePaymentData }) =>
      debtsService.addPayment(debtId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBT(variables.debtId) });
      queryClient.invalidateQueries({ queryKey: ['debts', 'summary'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    },
  });
};
