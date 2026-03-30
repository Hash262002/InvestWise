import { useState } from 'react'
import { LoginRequest } from '@/types/auth'
import { validateEmail } from '@/utils/validators'

interface LoginFormProps {
  onSubmit: (data: LoginRequest) => Promise<void>
  isLoading?: boolean
}

export const LoginForm = ({ onSubmit, isLoading = false }: LoginFormProps) => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      await onSubmit(formData)
    } catch (error) {
      // Error handled by useAuth hook
      console.error('Login failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value })
            if (errors.email) setErrors({ ...errors, email: undefined })
          }}
          className={`form-input ${errors.email ? 'border-red-500' : ''}`}
          placeholder="you@example.com"
          disabled={isLoading}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value })
            if (errors.password) setErrors({ ...errors, password: undefined })
          }}
          className={`form-input ${errors.password ? 'border-red-500' : ''}`}
          placeholder="••••••••"
          disabled={isLoading}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>

      {/* Forgot Password Link */}
      <div className="text-center">
        <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Forgot your password?
        </a>
      </div>
    </form>
  )
}
