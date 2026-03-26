// ========================================
// Protected Route Component
// ========================================
// Wraps routes that require authentication
// Redirects to login if not authenticated

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Readonly<ProtectedRouteProps>) {
  const { isAuthenticated, requires2FA } = useAuth();

  if (!isAuthenticated || requires2FA) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
