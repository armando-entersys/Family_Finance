import api from './api';
import { API_ENDPOINTS } from '@/constants';

export interface UserSettings {
  id: string;
  user_id: string;
  default_currency: string;
  language: string;
  notifications_enabled: boolean;
  dark_mode: boolean;
  biometric_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilySettings {
  id: string;
  name: string;
  base_currency: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joined_at: string;
  is_active: boolean;
}

export interface UpdateUserSettingsData {
  default_currency?: string;
  language?: string;
  notifications_enabled?: boolean;
  dark_mode?: boolean;
  biometric_enabled?: boolean;
}

export interface UpdateFamilySettingsData {
  name?: string;
  base_currency?: string;
  language?: string;
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
  const response = await api.patch<UserSettings>(API_ENDPOINTS.SETTINGS_USER, data);
  return response.data;
};

// Get family settings
export const getFamilySettings = async (): Promise<FamilySettings> => {
  const response = await api.get<FamilySettings>(API_ENDPOINTS.SETTINGS_FAMILY);
  return response.data;
};

// Update family settings (admin only)
export const updateFamilySettings = async (data: UpdateFamilySettingsData): Promise<FamilySettings> => {
  const response = await api.patch<FamilySettings>(API_ENDPOINTS.SETTINGS_FAMILY, data);
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
