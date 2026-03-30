import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoginRequest } from '@/types/auth'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, loading } = useAuth()

  const handleLogin = async (data: LoginRequest) => {
    await login(data.email, data.password)
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your InvestWise account">
      <LoginForm onSubmit={handleLogin} isLoading={loading} />

      {/* Sign Up Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign up
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}
