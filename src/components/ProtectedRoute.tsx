import { Navigate, Outlet } from 'react-router-dom';
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

  // Outlet pattern (nested routes)
  if (children === undefined) {
    return <Outlet />;
  }

  return <>{children}</>;
}
