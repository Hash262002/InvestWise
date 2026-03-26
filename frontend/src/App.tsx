// ========================================
// App Component - Main Router
// ========================================
// Sets up routing for:
// - Public routes (login, register)
// - Protected routes (dashboard, portfolios)
// - 2FA verification
// ========================================

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './stores/authStore';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TwoFactorPage from './pages/TwoFactorPage';
import DashboardPage from './pages/DashboardPage';
import PortfolioPage from './pages/PortfolioPage';

function App() {
  const { isAuthenticated, requires2FA } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={isAuthenticated && !requires2FA ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated && !requires2FA ? <Navigate to="/dashboard" /> : <RegisterPage />} 
        />
        <Route 
          path="/2fa" 
          element={requires2FA ? <TwoFactorPage /> : <Navigate to="/login" />} 
        />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/portfolio/:id" 
          element={
            <ProtectedRoute>
              <PortfolioPage />
            </ProtectedRoute>
          } 
        />

        {/* Catch All */}
        <Route path="/" element={<Navigate to={isAuthenticated && !requires2FA ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
