import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function InviteRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check for invite tokens on the root path
    if (location.pathname === '/') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('Checking for invite tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

      if (accessToken && refreshToken && type === 'invite') {
        console.log('Invite tokens detected, redirecting to /handle-invite');
        // Preserve the hash and redirect to handle-invite
        const newUrl = '/handle-invite' + window.location.hash;
        navigate(newUrl, { replace: true });
        return;
      }
    }
  }, [location.pathname, navigate]);

  return null;
}