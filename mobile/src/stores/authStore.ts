import { create } from 'zustand';
import type { User, AuthTokens } from '@/types';
import * as authService from '@/services/auth';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, familyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { user, tokens } = await authService.login({ email, password });
      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = authService.getErrorMessage(error);
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string, familyName?: string) => {
    set({ isLoading: true, error: null });

    try {
      // Register creates the user
      await authService.register({ email, password, name, family_name: familyName });

      // Then login
      const { user, tokens } = await authService.login({ email, password });
      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = authService.getErrorMessage(error);
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });

    try {
      const session = await authService.restoreSession();

      if (session) {
        set({
          user: session.user,
          tokens: session.tokens,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    set({ isLoading: true, error: null });

    try {
      const user = await authService.updateProfile(data);
      set({
        user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = authService.getErrorMessage(error);
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  completeOnboarding: async () => {
    try {
      const user = await authService.completeOnboarding();
      set({ user });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
