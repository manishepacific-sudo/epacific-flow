import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function InviteRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle direct access to root with invite params
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check if this is a token-based invite (new system)
    const hasCustomToken = urlParams.has('token');
    
    // Skip redirect if user is already on set-password page or it's a token-based invite
    if (location.pathname === '/set-password' || hasCustomToken) {
      console.log('🎫 Token-based invite or already on set-password page, skipping redirect');
      return;
    }
    
    // Check for legacy invite-related parameters in either URL or hash
    const hasLegacyInviteParams = urlParams.has('access_token') || hashParams.has('access_token') || 
                                 urlParams.has('type') || hashParams.has('type') ||
                                 window.location.pathname === '/auth-bridge';
    
    if (hasLegacyInviteParams || window.location.hash.includes('access_token')) {
      console.log('🔗 Legacy invite detected, redirecting to /handle-invite');
      const fullUrl = window.location.href;
      // Extract everything after the domain and redirect to handle-invite
      const redirectUrl = fullUrl.replace(window.location.origin, '') || '/';
      navigate(`/handle-invite${redirectUrl}`, { replace: true });
    }
  }, [location.hash, location.search, location.pathname, navigate]);

  return null;
}
