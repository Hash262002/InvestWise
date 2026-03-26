// ========================================
// Login Form Component
// ========================================
// Form for user login with email & password
// Handles:
// - Form validation
// - Login request
// - 2FA redirect
// - Error display

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { authStore } from '../../stores/authStore';

export default function LoginForm() {
  const navigate = useNavigate();
  const { setTokens, setUser, set2FARequired, setError, isLoading, setAuthLoading, error, clearError } = authStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLocalError(null);

    try {
      // Validate inputs
      if (!formData.email || !formData.password) {
        setLocalError('Email and password are required');
        setAuthLoading(false);
        return;
      }

      console.log('[Login] Attempting login with email:', formData.email);

      // Call login API
      const response = await authAPI.login(formData.email, formData.password);
      
      console.log('[Login] API Response:', response);

      // API returns: { status, message, data: { user, accessToken, refreshToken, requires2FA, tempToken } }
      if (response.data?.requires2FA) {
        // 2FA is required - store email for 2FA verification
        console.log('[Login] 2FA required');
        sessionStorage.setItem('loginEmail', formData.email);
        set2FARequired(true, response.data.tempToken);
        navigate('/2fa');
      } else {
        // Login successful
        console.log('[Login] Login successful, redirecting to dashboard');
        setTokens(response.data.accessToken, response.data.refreshToken);
        setUser(response.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('[Login] Error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      console.error('[Login] Error message:', errorMessage);
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message - Made more prominent */}
      {(localError || error) && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-base font-medium">
          ⚠️ {localError || error}
        </div>
      )}

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
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}
