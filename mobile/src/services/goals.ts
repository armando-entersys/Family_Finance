import api from './api';
import { API_ENDPOINTS } from '@/constants';

export interface Goal {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  description?: string;
  icon: string;
  target_amount: number;
  current_saved: number;
  currency_code: string;
  deadline?: string;
  goal_type: 'family' | 'personal';
  is_active: boolean;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface Contribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  is_withdrawal: boolean;
  notes?: string;
  created_at: string;
}

export interface GoalWithContributions extends Goal {
  contributions: Contribution[];
}

export interface CreateGoalData {
  name: string;
  description?: string;
  icon?: string;
  target_amount: number;
  currency_code?: string;
  deadline?: string;
  goal_type?: 'family' | 'personal';
}

export interface CreateContributionData {
  amount: number;
  is_withdrawal?: boolean;
  notes?: string;
}

// Get all goals
export const getGoals = async (includeInactive = false): Promise<Goal[]> => {
  const response = await api.get<Goal[]>(API_ENDPOINTS.GOALS, {
    params: { include_inactive: includeInactive },
  });
  return response.data;
};

// Get single goal with contributions
export const getGoal = async (goalId: string): Promise<GoalWithContributions> => {
  const response = await api.get<GoalWithContributions>(API_ENDPOINTS.GOAL(goalId));
  return response.data;
};

// Create a new goal
export const createGoal = async (data: CreateGoalData): Promise<Goal> => {
  const response = await api.post<Goal>(API_ENDPOINTS.GOALS, data);
  return response.data;
};

// Update a goal
export const updateGoal = async (goalId: string, data: Partial<CreateGoalData>): Promise<Goal> => {
  const response = await api.patch<Goal>(API_ENDPOINTS.GOAL(goalId), data);
  return response.data;
};

// Delete a goal
export const deleteGoal = async (goalId: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.GOAL(goalId));
};

// Add contribution to a goal
export const addContribution = async (
  goalId: string,
  data: CreateContributionData
): Promise<Contribution> => {
  const response = await api.post<Contribution>(
    API_ENDPOINTS.GOAL_CONTRIBUTIONS(goalId),
    data
  );
  return response.data;
};

// Get contributions for a goal
export const getContributions = async (
  goalId: string,
  limit = 50
): Promise<Contribution[]> => {
  const response = await api.get<Contribution[]>(
    API_ENDPOINTS.GOAL_CONTRIBUTIONS(goalId),
    { params: { limit } }
  );
  return response.data;
};
