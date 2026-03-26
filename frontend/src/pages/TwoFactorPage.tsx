// ========================================
// Two-Factor Authentication Page
// ========================================
// 2FA verification during login
// User enters code from authenticator app

import { Link } from 'react-router-dom';
import TwoFactorInput from '../components/auth/TwoFactorInput';

export default function TwoFactorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h1>
            <p className="text-gray-600 mt-2">Verify your identity</p>
          </div>

          {/* 2FA Form */}
          <TwoFactorInput />

          {/* Back Link */}
          <Link to="/login" className="block text-center mt-6">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Back to login
            </button>
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-6">
          © 2026 InvestWise. All rights reserved.
        </p>
      </div>
    </div>
  );
}
