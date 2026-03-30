import { useState } from 'react'
import { RegisterRequest } from '@/types/auth'
import { validateEmail, validatePassword, validateName } from '@/utils/validators'

interface RegisterFormProps {
  onSubmit: (data: RegisterRequest) => Promise<void>
  isLoading?: boolean
}

export const RegisterForm = ({ onSubmit, isLoading = false }: RegisterFormProps) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
    firstName?: string
    lastName?: string
  }>({})
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    } else if (!validateName(formData.firstName)) {
      newErrors.firstName = 'First name must be at least 2 characters'
    }

    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    } else if (!validateName(formData.lastName)) {
      newErrors.lastName = 'Last name must be at least 2 characters'
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password)
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.errors[0]
    }

    // Confirm password validation
    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      console.error('Registration failed:', error)
    }
  }

  const passwordValidation = validatePassword(formData.password)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => {
              setFormData({ ...formData, firstName: e.target.value })
              if (errors.firstName) setErrors({ ...errors, firstName: undefined })
            }}
            className={`form-input ${errors.firstName ? 'border-red-500' : ''}`}
            placeholder="John"
            disabled={isLoading}
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => {
              setFormData({ ...formData, lastName: e.target.value })
              if (errors.lastName) setErrors({ ...errors, lastName: undefined })
            }}
            className={`form-input ${errors.lastName ? 'border-red-500' : ''}`}
            placeholder="Doe"
            disabled={isLoading}
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
        </div>
      </div>

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
            setShowPasswordRequirements(true)
          }}
          onBlur={() => setShowPasswordRequirements(false)}
          className={`form-input ${errors.password ? 'border-red-500' : ''}`}
          placeholder="••••••••"
          disabled={isLoading}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}

        {/* Password Requirements */}
        {showPasswordRequirements && formData.password && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
            <p className={`${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
              ✓ At least 8 characters
            </p>
            <p className={`${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
              ✓ One uppercase letter
            </p>
            <p className={`${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
              ✓ One lowercase letter
            </p>
            <p className={`${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
              ✓ One number
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined })
          }}
          className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`}
          placeholder="••••••••"
          disabled={isLoading}
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn btn-primary w-full" disabled={isLoading || !passwordValidation.valid}>
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  )
}
