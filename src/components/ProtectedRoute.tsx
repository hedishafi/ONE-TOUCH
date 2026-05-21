
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const location = useLocation();

  const hasJwtToken = !!localStorage.getItem('access_token');
  const isAuthed = isAuthenticated || hasJwtToken;

  if (!isAuthed) {
    return <Navigate to={ROUTES.login} replace />;
  }

  if (location.pathname.startsWith('/orders')) {
    return children === undefined ? <Outlet /> : <>{children}</>;
  }

  if (currentUser) {
    const roles = allowedRoles ?? (requiredRole ? [requiredRole] : []);
    if (roles.length > 0 && !roles.includes(currentUser.role)) {
      const redirect =
        currentUser.role === 'client'
          ? '/client/dashboard'
          : currentUser.role === 'provider'
          ? '/provider/dashboard'
          : '/admin/dashboard';
      return <Navigate to={redirect} replace />;
    }

    const isProviderArea = location.pathname.startsWith('/provider/');
    const isIdentityUploadPage = location.pathname === '/provider/onboarding/step1';
    if (
      currentUser.role === 'provider' &&
      currentUser.verificationStatus === 'rejected' &&
      isProviderArea &&
      !isIdentityUploadPage
    ) {
      return <Navigate to="/provider/onboarding/step1" replace />;
    }
  }

  return children === undefined ? <Outlet /> : <>{children}</>;
}