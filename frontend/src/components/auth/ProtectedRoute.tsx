import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-primary-600" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to profile setup if not completed (except if already on profile page)
  if (user && !user.profileCompleted && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
}
