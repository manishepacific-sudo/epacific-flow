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
    console.log('ProtectedRoute effect:', { loading, user: !!user, profile, allowedRoles });
    
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to login');
        navigate('/login');
        return;
      }

      if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        console.log('User role not allowed:', profile.role, 'allowed:', allowedRoles);
        // Redirect to appropriate dashboard based on user role
        switch (profile.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'user':
          default:
            navigate('/user');
            break;
        }
        return;
      }
      
      console.log('Access granted for role:', profile?.role);
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