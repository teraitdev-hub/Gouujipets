import { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { UiverseLoader } from "../ui/UiverseLoader";

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles?: ('customer' | 'partner' | 'admin' | 'superadmin')[];
}

export const RequireAuth = ({ children, allowedRoles }: RequireAuthProps) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900/5 flex flex-col items-center justify-center p-6">
        <UiverseLoader text="verifying access..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (location.pathname.startsWith('/partner')) {
      return <Navigate to="/partner/login" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/login/admin" state={{ from: location }} replace />;
    }
    return <Navigate to="/login/user" state={{ from: location }} replace />;
  }

  
  // MANDATORY SECURITY INTERCEPTOR: All users must have a verified phone number
  if (user && !user.phone && location.pathname !== '/auth/verify-phone') {
    return <Navigate to="/auth/verify-phone" state={{ from: location }} replace />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role as any)) {
    if (user.role === 'partner') {
      return <Navigate to="/partner/dashboard" replace />;
    } else if (user.role === 'admin' || user.role === 'superadmin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      if (location.pathname.startsWith('/partner')) {
        return <Navigate to="/partner/login" state={{ roleMismatch: true, currentRole: user.role }} replace />;
      } else if (location.pathname.startsWith('/admin')) {
        return <Navigate to="/login/admin" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
