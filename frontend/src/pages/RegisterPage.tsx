import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { RegisterRequest } from '@/types/auth'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, loading } = useAuth()

  const handleRegister = async (data: RegisterRequest) => {
    await register(data.email, data.password, data.firstName, data.lastName)
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join InvestWise and start managing your portfolio">
      <RegisterForm onSubmit={handleRegister} isLoading={loading} />

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-600 text-sm">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:text-blue-700 font-semibold"
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}
