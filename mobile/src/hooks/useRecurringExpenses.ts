import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as recurringExpensesService from '@/services/recurringExpenses';
import type {
  RecurringExpense,
  CreateRecurringExpenseData,
  UpdateRecurringExpenseData,
  ExecuteRecurringExpenseData,
} from '@/services/recurringExpenses';

// List all recurring expenses
export const useRecurringExpenses = (includeInactive = false) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.RECURRING_EXPENSES, { includeInactive }],
    queryFn: () => recurringExpensesService.getRecurringExpenses(includeInactive),
  });
};

// List due expenses
export const useDueExpenses = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.RECURRING_EXPENSES, 'due'],
    queryFn: () => recurringExpensesService.getDueExpenses(),
  });
};

// Get single recurring expense
export const useRecurringExpense = (id: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.RECURRING_EXPENSE(id || ''),
    queryFn: () => recurringExpensesService.getRecurringExpense(id!),
    enabled: !!id,
  });
};

// Create recurring expense mutation
export const useCreateRecurringExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecurringExpenseData) =>
      recurringExpensesService.createRecurringExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSES });
    },
  });
};

// Update recurring expense mutation
export const useUpdateRecurringExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringExpenseData }) =>
      recurringExpensesService.updateRecurringExpense(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSE(variables.id) });
    },
  });
};

// Delete recurring expense mutation
export const useDeleteRecurringExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recurringExpensesService.deleteRecurringExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSES });
    },
  });
};

// Execute recurring expense mutation
export const useExecuteRecurringExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ExecuteRecurringExpenseData }) =>
      recurringExpensesService.executeRecurringExpense(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RECURRING_EXPENSE(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORY_BUDGETS });
    },
  });
};
