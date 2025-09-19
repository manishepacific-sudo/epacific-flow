import { ComponentType } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface WithRoleGuardProps {
  [key: string]: any;
}

export function withRoleGuard<P extends WithRoleGuardProps>(
  WrappedComponent: ComponentType<P>,
  requiredRole: 'admin' | 'manager' | 'user'
) {
  return function GuardedComponent(props: P) {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          navigate('/login');
          return;
        }

        if (profile && profile.role !== requiredRole) {
          // Redirect to appropriate dashboard based on actual user role
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
    }, [user, profile, loading, navigate]);

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

    if (profile && profile.role !== requiredRole) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}