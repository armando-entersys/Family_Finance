import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';
import type { APIError, AuthTokens } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Note: Some endpoints require trailing slashes due to server configuration
// Keep trailing slashes as defined in API_ENDPOINTS constants

// Token refresh state
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth header for login/register
    const publicPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password', '/health'];
    if (publicPaths.some((path) => config.url?.includes(path))) {
      return config;
    }

    const token = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    const originalRequest = error.config;

    // If 401 and not a refresh request, try to refresh token
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await api.post<AuthTokens>('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        // Store new tokens
        await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token);

        // Notify subscribers
        onTokenRefreshed(access_token);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        await storage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
        await storage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
        await storage.deleteItem(STORAGE_KEYS.USER);

        // Emit event for auth store to handle
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper to extract error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError | undefined;
    if (apiError?.detail) {
      if (typeof apiError.detail === 'string') {
        return apiError.detail;
      }
      // Validation errors
      return apiError.detail.map((e) => e.msg).join(', ');
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;
