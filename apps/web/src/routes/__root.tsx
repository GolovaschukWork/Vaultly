import { createRootRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

function RootLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';

  if (loading) {
    return (
      <div className="bg-surface flex min-h-screen items-center justify-center">
        <Loader2 className="text-content-muted h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session && !isLoginRoute) {
    return <Navigate to="/login" replace />;
  }

  if (session && isLoginRoute) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootLayout,
});
