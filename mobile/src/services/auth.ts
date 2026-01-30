import storage from '@/utils/storage';
import api, { getErrorMessage } from './api';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/constants';
import type { AuthTokens, User } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  family_name?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

// Login with email/password
export const login = async (credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> => {
  // OAuth2 password flow requires form data
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  const tokenResponse = await api.post<AuthTokens>(API_ENDPOINTS.LOGIN, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const tokens = tokenResponse.data;

  // Store tokens
  await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
  await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);

  // Get user info
  const userResponse = await api.get<User>(API_ENDPOINTS.ME);
  const user = userResponse.data;

  // Store user
  await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  return { user, tokens };
};

// Register new user
export const register = async (data: RegisterData): Promise<User> => {
  const response = await api.post<User>(API_ENDPOINTS.REGISTER, {
    email: data.email,
    password: data.password,
    name: data.name,
    family_name: data.family_name,
  });

  return response.data;
};

// Update user profile
export const updateProfile = async (data: UpdateProfileData): Promise<User> => {
  const response = await api.patch<User>(API_ENDPOINTS.ME, data);

  // Update stored user
  await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));

  return response.data;
};

// Logout - Clear stored tokens
export const logout = async (): Promise<void> => {
  await storage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
  await storage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
  await storage.deleteItem(STORAGE_KEYS.USER);
};

// Get current user from API
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>(API_ENDPOINTS.ME);
  return response.data;
};

// Restore session from stored tokens
export const restoreSession = async (): Promise<{ user: User; tokens: AuthTokens } | null> => {
  try {
    const accessToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userJson = await storage.getItem(STORAGE_KEYS.USER);

    if (!accessToken || !refreshToken) {
      return null;
    }

    // Try to get current user to validate token
    const user = await getCurrentUser();

    // Update stored user
    await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

    return {
      user,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 3600,
      },
    };
  } catch (error) {
    // Token invalid, clear storage
    await logout();
    return null;
  }
};

// Refresh tokens
export const refreshTokens = async (): Promise<AuthTokens> => {
  const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await api.post<AuthTokens>(API_ENDPOINTS.REFRESH, {
    refresh_token: refreshToken,
  });

  const tokens = response.data;

  // Store new tokens
  await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
  await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);

  return tokens;
};

export { getErrorMessage };
