// ========================================
// Auth Store (Zustand)
// ========================================
// Global state management for authentication
// Handles:
// - Login/logout
// - Token management
// - User profile
// - 2FA status
// ========================================

import { create } from 'zustand';

// ----------------------------------------
// Type Definitions
// ----------------------------------------

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  // Authentication
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // 2FA
  requires2FA: boolean;
  tempToken: string | null;

  // Actions
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setAuthLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  set2FARequired: (required: boolean, tempToken?: string) => void;
  logout: () => void;
  clearError: () => void;
}

// ----------------------------------------
// Create Store
// ----------------------------------------

export const authStore = create<AuthState>((set: any) => ({
  // Initial state
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  requires2FA: false,
  tempToken: null,

  // ----------------
  // Actions
  // ----------------

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
    localStorage.setItem('user', JSON.stringify(user));
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  setAuthLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  set2FARequired: (required: boolean, tempToken?: string) => {
    set({ requires2FA: required, tempToken: tempToken || null });
    if (tempToken) {
      sessionStorage.setItem('tempToken', tempToken);
    } else {
      sessionStorage.removeItem('tempToken');
    }
  },

  logout: () => {
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      requires2FA: false,
      tempToken: null,
      error: null,
    });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('tempToken');
  },

  clearError: () => {
    set({ error: null });
  },
}));

// ----------------------------------------
// Helper Hooks
// ----------------------------------------

export const useAuth = () => authStore();

export const useIsAuthenticated = () => authStore((state: AuthState) => state.isAuthenticated);

export const useUser = () => authStore((state: AuthState) => state.user);

export const useAuthTokens = () => ({
  accessToken: authStore((state: AuthState) => state.accessToken),
  refreshToken: authStore((state: AuthState) => state.refreshToken),
});
