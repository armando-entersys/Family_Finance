import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants';
import * as settingsService from '@/services/settings';
import type { UpdateUserSettingsData, UpdateFamilySettingsData, InviteMemberData } from '@/services/settings';

// Get user settings
export const useUserSettings = () => {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS_USER,
    queryFn: () => settingsService.getUserSettings(),
  });
};

// Update user settings
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserSettingsData) => settingsService.updateUserSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS_USER });
    },
  });
};

// Get family settings
export const useFamilySettings = () => {
  return useQuery({
    queryKey: QUERY_KEYS.SETTINGS_FAMILY,
    queryFn: () => settingsService.getFamilySettings(),
  });
};

// Update family settings
export const useUpdateFamilySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFamilySettingsData) => settingsService.updateFamilySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS_FAMILY });
    },
  });
};

// Get family members
export const useFamilyMembers = () => {
  return useQuery({
    queryKey: QUERY_KEYS.FAMILY_MEMBERS,
    queryFn: () => settingsService.getFamilyMembers(),
  });
};

// Invite family member
export const useInviteFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberData) => settingsService.inviteFamilyMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAMILY_MEMBERS });
    },
  });
};

// Remove family member
export const useRemoveFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => settingsService.removeFamilyMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAMILY_MEMBERS });
    },
  });
};
