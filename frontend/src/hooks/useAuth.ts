// useAuth Hook - Auth logic
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { authService } from '@/services/authService'
import { User } from '@/types/auth'

export const useAuth = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading, setUser, setTokens, setLoading, logout, initializeFromStorage } = useAuthStore()
  const { addToast } = useUIStore()

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const response = await authService.login(email, password)
        setUser(response.user)
        setTokens(response.tokens.accessToken, response.tokens.refreshToken)
        addToast({ message: 'Login successful', type: 'success' })
        navigate('/home')
      } catch (error: any) {
        const message = error.response?.data?.message || 'Login failed'
        addToast({ message, type: 'error' })
        throw error
      } finally {
        setLoading(false)
      }
    },
    [setUser, setTokens, setLoading, addToast, navigate]
  )

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string) => {
      setLoading(true)
      try {
        const response = await authService.register(email, password, firstName, lastName)
        setUser(response.user)
        setTokens(response.tokens.accessToken, response.tokens.refreshToken)
        addToast({ message: 'Registration successful', type: 'success' })
        navigate('/home')
      } catch (error: any) {
        const message = error.response?.data?.message || 'Registration failed'
        addToast({ message, type: 'error' })
        throw error
      } finally {
        setLoading(false)
      }
    },
    [setUser, setTokens, setLoading, addToast, navigate]
  )

  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      logout()
      navigate('/login')
      addToast({ message: 'Logged out successfully', type: 'success' })
    }
  }, [logout, navigate, addToast])

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout: handleLogout,
    initializeFromStorage,
  }
}
