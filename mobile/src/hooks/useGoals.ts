import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as goalsService from '@/services/goals';
import type { Goal, GoalWithContributions, CreateGoalData, CreateContributionData } from '@/services/goals';

// List all goals
export const useGoals = (includeInactive = false) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.GOALS, { includeInactive }],
    queryFn: () => goalsService.getGoals(includeInactive),
  });
};

// Get single goal with contributions
export const useGoal = (goalId: string | undefined) => {
  return useQuery({
    queryKey: QUERY_KEYS.GOAL(goalId || ''),
    queryFn: () => goalsService.getGoal(goalId!),
    enabled: !!goalId,
  });
};

// Create goal mutation
export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoalData) => goalsService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOALS });
    },
  });
};

// Update goal mutation
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: Partial<CreateGoalData> }) =>
      goalsService.updateGoal(goalId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOAL(variables.goalId) });
    },
  });
};

// Delete goal mutation
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId: string) => goalsService.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOALS });
    },
  });
};

// Add contribution mutation
export const useAddContribution = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: CreateContributionData }) =>
      goalsService.addContribution(goalId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOALS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GOAL(variables.goalId) });
    },
  });
};
