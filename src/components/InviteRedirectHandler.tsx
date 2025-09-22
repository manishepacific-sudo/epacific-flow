import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function InviteRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash.includes('access_token')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'invite') {
        console.log('🔗 Invite detected, redirecting to /handle-invite');
        navigate(
          `/handle-invite#access_token=${accessToken}&refresh_token=${refreshToken || ''}&type=invite`,
          { replace: true }
        );
      }
    }
  }, [location.hash, navigate]);

  return null;
}
