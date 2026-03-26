// ========================================
// Register Form Component
// ========================================
// Form for user registration
// Handles:
// - Email validation
// - Password strength
// - Name validation
// - Registration request
// - Error display

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { authStore } from '../../stores/authStore';

export default function RegisterForm() {
  const navigate = useNavigate();
  const { setTokens, setUser, setError, isLoading, setAuthLoading, error, clearError } = authStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError(null);
    clearError();
  };

  const validateForm = (): string | null => {
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      return 'All fields are required';
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/[a-z]/.test(formData.password)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/\d/.test(formData.password)) {
      return 'Password must contain at least one number';
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (formData.firstName.length < 2 || formData.lastName.length < 2) {
      return 'First and last names must be at least 2 characters';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLocalError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      setAuthLoading(false);
      return;
    }

    try {
      // Call register API
      const response = await authAPI.register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );

      // Registration successful - set tokens and redirect
      // API returns: { status, message, data: { user, accessToken, refreshToken } }
      setTokens(response.data.accessToken, response.data.refreshToken);
      setUser(response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {(localError || error) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {localError || error}
        </div>
      )}

      {/* First and Last Name */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
            className="input-field"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            className="input-field"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          className="input-field"
          disabled={isLoading}
        />
      </div>

      {/* Password Input */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          className="input-field"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-2">
          8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%^&*(),.?)
        </p>
      </div>

      {/* Confirm Password Input */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          className="input-field"
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{ width: '20px', height: '20px' }} />
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </button>
    </form>
  );
}
