import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

export function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // Skip redirect if on public routes
      const publicRoutes = ['/set-password', '/login', '/reset-password', '/handle-invite'];
      if (publicRoutes.includes(window.location.pathname)) {
        return;
      }
      
      if (user && profile) {
        // Check if user needs to set password first
        if (!profile.password_set) {
          navigate('/set-password', { replace: true });
          return;
        }
        
        // User is authenticated, redirect to appropriate dashboard
        switch (profile.role) {
          case 'admin':
            navigate('/dashboard/admin', { replace: true });
            break;
          case 'manager':
            navigate('/dashboard/manager', { replace: true });
            break;
          case 'user':
          default:
            navigate('/dashboard/user', { replace: true });
            break;
        }
      } else {
        // User not authenticated, redirect to login
        navigate('/login', { replace: true });
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

  return null;
}