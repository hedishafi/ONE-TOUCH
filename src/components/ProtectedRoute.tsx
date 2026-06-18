import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';
import { ROUTES } from '../utils/constants';
import { useEffect, useState } from 'react';

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
  const [mounted, setMounted] = useState(false);

  // Force re-render when auth state changes
  useEffect(() => {
    setMounted(true);
    console.log('🔐 ProtectedRoute mounted/updated:', {
      isAuthenticated,
      currentUser,
      allowedRoles,
      pathname: location.pathname,
    });
  }, [isAuthenticated, currentUser, allowedRoles, location.pathname]);

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || !currentUser) {
    console.log('❌ ProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to={ROUTES.login} replace />;
  }

  const roles = allowedRoles ?? (requiredRole ? [requiredRole] : []);

  if (roles.length > 0 && !roles.includes(currentUser.role)) {
    console.log('❌ ProtectedRoute: Role mismatch, redirecting');
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
    console.log('❌ ProtectedRoute: Provider rejected, redirecting to identity upload');
    return <Navigate to="/provider/onboarding/step1" replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');

  // Outlet pattern (nested routes)
  if (children === undefined) {
    return <Outlet />;
  }

  return <>{children}</>;
}
