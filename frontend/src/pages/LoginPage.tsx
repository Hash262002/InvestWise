// ========================================
// Login Page
// ========================================
// User login with email and password
// Redirects to 2FA if enabled on account

import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">InvestWise</h1>
            <p className="text-gray-600 mt-2">AI-Powered Portfolio Analyzer</p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-sm text-gray-500">New user?</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Register Link */}
          <Link to="/register" className="block text-center">
            <button className="btn-secondary w-full">
              Create an account
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
