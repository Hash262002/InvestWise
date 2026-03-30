import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/uiStore'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { toggleCreatePortfolioModal } = useUIStore()

  const handleLogout = async () => {
    await logout()
  }

  if (!user) return null

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">InvestWise</span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate('/home')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm"
            >
              Portfolios
            </button>
            <button
              onClick={() => navigate('/market')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm"
            >
              Market
            </button>
            <button
              onClick={() => navigate('/analysis')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm"
            >
              Analysis
            </button>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleCreatePortfolioModal()}
              className="btn btn-primary text-sm hidden sm:block"
            >
              + New Portfolio
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-600 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
