import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';

export default function HandleInvite() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInviteLink = async () => {
      try {
        console.log('🔍 Current URL:', window.location.href);
        
        // Parse both hash and query params to handle different Supabase invite formats
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        console.log('📊 Hash params:', Object.fromEntries(hashParams.entries()));
        console.log('📊 Query params:', Object.fromEntries(queryParams.entries()));
        
        // Check for error first (when invite link expired)
        const error = hashParams.get('error') || queryParams.get('error');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error) {
          console.error('Invite link error:', { error, errorCode, errorDescription });
          if (errorCode === 'otp_expired') {
            setError('This invite link has expired. Please request a new invitation.');
          } else {
            setError(decodeURIComponent(errorDescription || 'Invalid invite link'));
          }
          return;
        }

        // Get tokens from either source
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || queryParams.get('token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');

        if (!accessToken) {
          setError('Invalid invite link - no access token found');
          return;
        }

        console.log('Processing invite with token:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken, type });

        // Handle session setup - try different methods based on available tokens
        let sessionResult;
        if (refreshToken) {
          console.log('🔑 Using setSession with both tokens');
          // If we have both tokens, use setSession
          sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        } else {
          console.log('🔑 Using exchangeCodeForSession with access token only');
          // If we only have access token, try to exchange it
          sessionResult = await supabase.auth.exchangeCodeForSession(accessToken);
        }

        const { data, error: sessionError } = sessionResult;

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
            setError('This invite link has expired. Please request a new invitation.');
          } else {
            setError('Failed to process invite link. Please try again or request a new invitation.');
          }
          return;
        }

        if (data.user) {
          console.log('✅ User authenticated successfully, checking profile...');
          
          // Check if user needs to set password
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('password_set, email, role')
            .eq('user_id', data.user.id)
            .single();
            
          if (profileError) {
            console.error('Profile error:', profileError);
            setError('Failed to load user profile');
            return;
          }
          
          console.log('👤 User profile:', profile);
          
          if (!profile.password_set) {
            console.log('🔐 Password not set, redirecting to set password page');
            // Navigate to set password page with user email
            navigate(`/set-password#email=${encodeURIComponent(data.user.email || profile.email)}`);
          } else {
            console.log('✅ Password already set, redirecting to dashboard');
            // User already has password set, redirect to appropriate dashboard
            const role = data.user.user_metadata?.role || profile.role;
            const dashboardMap = {
              admin: '/dashboard/admin',
              manager: '/dashboard/manager',
              user: '/dashboard/user'
            };
            navigate(dashboardMap[role] || '/dashboard/user');
          }
        } else {
          setError('No user found in invite');
        }
      } catch (err) {
        console.error('Error handling invite:', err);
        setError('An unexpected error occurred. Please try again or request a new invitation.');
      } finally {
        setLoading(false);
      }
    };

    handleInviteLink();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="p-8" glass>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Processing your invite...</h2>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <GlassCard className="p-8" glass>
          <h2 className="text-xl text-destructive">{error}</h2>
          <button onClick={() => navigate('/login')} className="glass-button mt-4">
            Go to Login
          </button>
        </GlassCard>
      </div>
    );
  }

  return null;
}
