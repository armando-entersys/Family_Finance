import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as categoryBudgetsService from '@/services/categoryBudgets';
import type {
  CategoryBudget,
  CategoryBudgetStatus,
  CreateCategoryBudgetData,
  UpdateCategoryBudgetData,
} from '@/services/categoryBudgets';

// List all category budgets
export const useCategoryBudgets = () => {
  return useQuery({
    queryKey: QUERY_KEYS.CATEGORY_BUDGETS,
    queryFn: () => categoryBudgetsService.getCategoryBudgets(),
  });
};

// Get all budgets with status
export const useCategoryBudgetsStatus = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CATEGORY_BUDGETS, 'status'],
    queryFn: () => categoryBudgetsService.getCategoryBudgetsStatus(),
  });
};

// Get single category budget
export const useCategoryBudget = (id: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.CATEGORY_BUDGET(id || ''),
    queryFn: () => categoryBudgetsService.getCategoryBudget(id!),
    enabled: !!id,
  });
};

// Create category budget mutation
export const useCreateCategoryBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryBudgetData) =>
      categoryBudgetsService.createCategoryBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORY_BUDGETS });
    },
  });
};

// Update category budget mutation
export const useUpdateCategoryBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryBudgetData }) =>
      categoryBudgetsService.updateCategoryBudget(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORY_BUDGETS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORY_BUDGET(variables.id) });
    },
  });
};

// Delete category budget mutation
export const useDeleteCategoryBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryBudgetsService.deleteCategoryBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATEGORY_BUDGETS });
    },
  });
};
