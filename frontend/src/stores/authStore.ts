// Auth Store - User authentication state
import { create } from 'zustand'
import { User, AuthTokens } from '@/types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean

  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  initializeFromStorage: () => void
}

const STORAGE_KEY_USER = import.meta.env.VITE_USER_STORAGE_KEY || 'investwise_user'
const STORAGE_KEY_TOKENS = import.meta.env.VITE_TOKEN_STORAGE_KEY || 'investwise_tokens'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,

  setUser: (user: User) => {
    set({ user, isAuthenticated: true })
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    set({ accessToken, refreshToken, isAuthenticated: true })
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify({ accessToken, refreshToken }))
  },

  setLoading: (loading: boolean) => set({ loading }),

  logout: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKENS)
  },

  initializeFromStorage: () => {
    const storedUser = localStorage.getItem(STORAGE_KEY_USER)
    const storedTokens = localStorage.getItem(STORAGE_KEY_TOKENS)

    if (storedUser && storedTokens) {
      try {
        const user = JSON.parse(storedUser)
        const { accessToken, refreshToken } = JSON.parse(storedTokens)
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      } catch (error) {
        console.error('Failed to restore auth state:', error)
      }
    }
  },
}))
