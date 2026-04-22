import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';
import { ROUTES } from '../utils/constants';

interface ProtectedRouteProps {
  /** For wrapping nested routes with <Outlet /> */
  allowedRoles?: UserRole[];
  /** Legacy: for wrapping children directly */
  children?: React.ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={ROUTES.login} replace />;
  }

  const roles = allowedRoles ?? (requiredRole ? [requiredRole] : []);

  if (roles.length > 0 && !roles.includes(currentUser.role)) {
    const redirect =
      currentUser.role === 'client'
        ? ROUTES.clientDashboard
        : currentUser.role === 'provider'
        ? ROUTES.providerDashboard
        : ROUTES.adminDashboard;
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

  // Outlet pattern (nested routes)
  if (children === undefined) {
    return <Outlet />;
  }

  return <>{children}</>;
}
