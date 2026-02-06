import api from './api';
import { API_ENDPOINTS } from '@/constants';

// Backend response types
export interface UserSettings {
  daily_summary_enabled: boolean;
  notification_time: string;
  preferred_currency: string;
  language: string;
}

export interface FamilySettings {
  name: string;
  month_close_day: number;
  default_currency: string;
  budget_warning_threshold: number;
}

export interface FamilyMember {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MEMBER';
  is_active: boolean;
}

export interface UpdateUserSettingsData {
  daily_summary_enabled?: boolean;
  notification_time?: string;
  preferred_currency?: string;
  language?: string;
}

export interface UpdateFamilySettingsData {
  month_close_day?: number;
  default_currency?: string;
  budget_warning_threshold?: number;
}

export interface InviteMemberData {
  email: string;
  role?: 'ADMIN' | 'MEMBER';
}

// Get user settings
export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await api.get<UserSettings>(API_ENDPOINTS.SETTINGS_USER);
  return response.data;
};

// Update user settings
export const updateUserSettings = async (data: UpdateUserSettingsData): Promise<UserSettings> => {
  // Get current settings first to merge with updates
  const current = await getUserSettings();
  const merged = {
    daily_summary_enabled: data.daily_summary_enabled ?? current.daily_summary_enabled,
    notification_time: data.notification_time ?? current.notification_time,
    preferred_currency: data.preferred_currency ?? current.preferred_currency,
    language: data.language ?? current.language,
  };
  const response = await api.patch<UserSettings>(API_ENDPOINTS.SETTINGS_USER, merged);
  return response.data;
};

// Get family settings
export const getFamilySettings = async (): Promise<FamilySettings> => {
  const response = await api.get<FamilySettings>(API_ENDPOINTS.SETTINGS_FAMILY);
  return response.data;
};

// Update family settings (admin only)
export const updateFamilySettings = async (data: UpdateFamilySettingsData): Promise<FamilySettings> => {
  // Get current settings first to merge with updates
  const current = await getFamilySettings();
  const merged = {
    month_close_day: data.month_close_day ?? current.month_close_day,
    default_currency: data.default_currency ?? current.default_currency,
    budget_warning_threshold: data.budget_warning_threshold ?? current.budget_warning_threshold,
  };
  const response = await api.patch<FamilySettings>(API_ENDPOINTS.SETTINGS_FAMILY, merged);
  return response.data;
};

// Get family members
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  const response = await api.get<FamilyMember[]>(API_ENDPOINTS.SETTINGS_FAMILY_MEMBERS);
  return response.data;
};

// Invite a family member (admin only)
export const inviteFamilyMember = async (data: InviteMemberData): Promise<FamilyMember> => {
  const response = await api.post<FamilyMember>(API_ENDPOINTS.SETTINGS_FAMILY_INVITE, data);
  return response.data;
};

// Remove a family member (admin only)
export const removeFamilyMember = async (memberId: string): Promise<void> => {
  await api.delete(API_ENDPOINTS.SETTINGS_FAMILY_MEMBER(memberId));
};

// Update family name (admin only)
export const updateFamilyName = async (name: string): Promise<FamilySettings> => {
  const response = await api.patch<FamilySettings>(`${API_ENDPOINTS.SETTINGS_FAMILY}/name`, { name });
  return response.data;
};
