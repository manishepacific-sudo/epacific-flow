import { useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

export function AuthRedirect() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user && profile) {
        // User is authenticated, redirect to appropriate dashboard
        switch (profile.role) {
          case 'admin':
            navigate('/admin-dashboard', { replace: true });
            break;
          case 'manager':
            navigate('/manager-dashboard', { replace: true });
            break;
          case 'user':
          default:
            navigate('/user-dashboard', { replace: true });
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