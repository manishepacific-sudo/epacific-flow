import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }

      if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // Redirect to appropriate dashboard based on user role
        switch (profile.role) {
          case 'admin':
            navigate('/dashboard/admin');
            break;
          case 'manager':
            navigate('/dashboard/manager');
            break;
          case 'user':
          default:
            navigate('/dashboard/user');
            break;
        }
        return;
      }
    }
  }, [user, profile, loading, navigate, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}