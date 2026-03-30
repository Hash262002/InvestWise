// Auth Service
import apiClient from './api'
import { AuthResponse, LoginRequest, RegisterRequest, AuthTokens } from '@/types/auth'

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', { email, password } as LoginRequest)
    return response.data
  },

  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    } as RegisterRequest)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken })
    return response.data
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile')
    return response.data.user
  },

  updateProfile: async (data: any) => {
    const response = await apiClient.put('/auth/profile', data)
    return response.data.user
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.put('/auth/password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },
}
