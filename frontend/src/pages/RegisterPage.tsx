// ========================================
// Register Page
// ========================================
// User registration with validation
// Redirects to dashboard on success

import { Link } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">InvestWise</h1>
            <p className="text-gray-600 mt-2">Create your account</p>
          </div>

          {/* Register Form */}
          <RegisterForm />

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-3 text-sm text-gray-500">Already have an account?</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Login Link */}
          <Link to="/login" className="block text-center">
            <button className="btn-secondary w-full">
              Sign in instead
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
