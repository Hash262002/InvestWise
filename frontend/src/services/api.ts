// ========================================
// API Service with Axios Interceptors
// ========================================
// Handles HTTP requests with:
// - Token management (access/refresh)
// - Automatic token refresh
// - Error handling
// - Request/response logging
// ========================================

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authStore } from '../stores/authStore';

// ----------------------------------------
// Create Axios Instance
// ----------------------------------------

export const API_URL = import.meta.env.VITE_API_URL as string || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// ----------------------------------------
// Request Interceptor
// ----------------------------------------
// Adds access token to all requests

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authState = authStore.getState();
    
    // Attach access token if available
    if (authState.accessToken) {
      config.headers.Authorization = `Bearer ${authState.accessToken}`;
    }

    // Log request details
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    throw error;
  }
);

// ----------------------------------------
// Response Interceptor
// ----------------------------------------
// Handles token refresh and error responses

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authState = authStore.getState();
        const refreshToken = authState.refreshToken;

        if (!refreshToken) {
          // No refresh token - logout user
          authStore.getState().logout();
          globalThis.location.href = '/login';
          throw error;
        }

        // Try to refresh token
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update tokens in store
        authStore.getState().setTokens(accessToken, newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        authStore.getState().logout();
        globalThis.location.href = '/login';
        throw refreshError;
      }
    }

    // Handle specific error codes
    if (error.response?.status === 403) {
      console.error('[API Error] Forbidden - Access denied');
    } else if (error.response?.status === 404) {
      console.error('[API Error] Not found');
    } else if (error.response?.status === 500) {
      console.error('[API Error] Server error');
    }

    throw error;
  }
);

// ----------------------------------------
// Auth API Functions
// ----------------------------------------

export const authAPI = {
  register: async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await apiClient.post('/api/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  verify2FA: async (email: string, token: string, tempToken: string) => {
    const response = await apiClient.post('/api/auth/verify-2fa', {
      email,
      token,
      tempToken,
    });
    return response.data;
  },

  enable2FA: async () => {
    const response = await apiClient.post('/api/auth/enable-2fa');
    return response.data;
  },

  confirm2FA: async (token: string) => {
    const response = await apiClient.post('/api/auth/confirm-2fa', {
      token,
    });
    return response.data;
  },

  disable2FA: async (password: string) => {
    const response = await apiClient.post('/api/auth/disable-2fa', {
      password,
    });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  updateProfile: async (firstName: string, lastName: string) => {
    const response = await apiClient.put('/api/auth/profile', {
      firstName,
      lastName,
    });
    return response.data;
  },
};

// ----------------------------------------
// Portfolio API Functions
// ----------------------------------------

export const portfolioAPI = {
  getPortfolios: async () => {
    const response = await apiClient.get('/api/portfolios');
    return response.data;
  },

  createPortfolio: async (name: string, description?: string, type?: string) => {
    const response = await apiClient.post('/api/portfolios', {
      name,
      description,
      type,
    });
    return response.data;
  },

  getPortfolio: async (id: string) => {
    const response = await apiClient.get(`/api/portfolios/${id}`);
    return response.data;
  },

  updatePortfolio: async (id: string, data: any) => {
    const response = await apiClient.put(`/api/portfolios/${id}`, data);
    return response.data;
  },

  deletePortfolio: async (id: string) => {
    const response = await apiClient.delete(`/api/portfolios/${id}`);
    return response.data;
  },
};

// ----------------------------------------
// Holding API Functions
// ----------------------------------------

export const holdingAPI = {
  addHolding: async (portfolioId: string, holdingData: any) => {
    const response = await apiClient.post(
      `/api/portfolios/${portfolioId}/holdings`,
      holdingData
    );
    return response.data;
  },

  updateHolding: async (portfolioId: string, holdingId: string, holdingData: any) => {
    const response = await apiClient.put(
      `/api/portfolios/${portfolioId}/holdings/${holdingId}`,
      holdingData
    );
    return response.data;
  },

  deleteHolding: async (portfolioId: string, holdingId: string) => {
    const response = await apiClient.delete(
      `/api/portfolios/${portfolioId}/holdings/${holdingId}`
    );
    return response.data;
  },
};

// ----------------------------------------
// Import API Functions (CSV Imports)
// ----------------------------------------

export const importAPI = {
  createImport: async (name: string, data: any[], description?: string, originalFileName?: string) => {
    const response = await apiClient.post('/api/imports', {
      name,
      description,
      originalFileName,
      data,
    });
    return response.data;
  },

  listImports: async () => {
    const response = await apiClient.get('/api/imports');
    return response.data;
  },

  getImport: async (id: string) => {
    const response = await apiClient.get(`/api/imports/${id}`);
    return response.data;
  },

  updateImport: async (id: string, data: { name?: string; description?: string; data?: any[] }) => {
    const response = await apiClient.put(`/api/imports/${id}`, data);
    return response.data;
  },

  deleteImport: async (id: string) => {
    const response = await apiClient.delete(`/api/imports/${id}`);
    return response.data;
  },
};

// ----------------------------------------
// Analysis API Functions
// ----------------------------------------

export const analysisAPI = {
  requestAnalysis: async (portfolioId: string, requestType: string = 'full') => {
    const response = await apiClient.post(`/api/analysis/portfolio/${portfolioId}`, {
      requestType,
    });
    return response.data;
  },

  getAnalysis: async (portfolioId: string) => {
    const response = await apiClient.get(`/api/analysis/portfolio/${portfolioId}`);
    return response.data;
  },
};

export default apiClient;
