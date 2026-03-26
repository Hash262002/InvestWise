// ========================================
// Two-Factor Authentication Input Component
// ========================================
// Handles 2FA verification during login
// Displays OTP input and submit

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { authStore } from '../../stores/authStore';

export default function TwoFactorInput() {
  const navigate = useNavigate();
  const { tempToken, setTokens, setUser, set2FARequired, setError, isLoading, setAuthLoading, error, clearError } = authStore();

  const [token, setToken] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and dashes
    const value = e.target.value.replaceAll(/[^\d-]/g, '');
    setToken(value);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLocalError(null);

    try {
      if (!token) {
        setLocalError('Please enter your 6-digit code');
        setAuthLoading(false);
        return;
      }

      if (!tempToken) {
        setLocalError('Session expired. Please login again.');
        navigate('/login');
        setAuthLoading(false);
        return;
      }

      // Get email from sessionStorage where it was stored during login
      const email = sessionStorage.getItem('loginEmail') || '';

      if (!email) {
        setLocalError('Email not found. Please login again.');
        navigate('/login');
        setAuthLoading(false);
        return;
      }

      // Verify 2FA token
      const response = await authAPI.verify2FA(email, token, tempToken);

      // 2FA verification successful
      // API returns: { status, message, data: { user, accessToken, refreshToken } }
      setTokens(response.data.accessToken, response.data.refreshToken);
      setUser(response.data.user);
      set2FARequired(false);

      // Clean up
      sessionStorage.removeItem('loginEmail');

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '2FA verification failed. Please try again.';
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        Enter the 6-digit code from your authenticator app
      </div>

      {/* Error Message */}
      {(localError || error) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {localError || error}
        </div>
      )}

      {/* 2FA Code Input */}
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
          Authentication Code
        </label>
        <input
          id="token"
          type="text"
          value={token}
          onChange={handleChange}
          placeholder="000000"
          maxLength={6}
          className="input-field text-center text-2xl tracking-widest font-mono"
          disabled={isLoading}
          autoFocus
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || token.length !== 6}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="spinner" style={{ width: '20px', height: '20px' }} />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </button>

      {/* Backup Code Option */}
      <button
        type="button"
        className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Don't have your authenticator? Use backup code
      </button>
    </form>
  );
}
