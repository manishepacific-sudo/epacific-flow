import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function InviteRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/handle-invite')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || queryParams.get('token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      console.log('Checking for invite tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

      if (accessToken && type === 'invite') {
        console.log('Invite tokens detected, redirecting to /handle-invite');
        const newUrl = `/handle-invite#access_token=${accessToken}&type=invite${refreshToken ? `&refresh_token=${refreshToken}` : ''}`;
        navigate(newUrl, { replace: true });
        return;
      }
    }
  }, [location.pathname, navigate]);

  return null;
}