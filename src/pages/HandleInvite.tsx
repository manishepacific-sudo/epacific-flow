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
        console.log('🔍 Hash:', window.location.hash);
        console.log('🔍 Search:', window.location.search);
        
        // Parse both hash and query params to handle different Supabase invite formats
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        console.log('📊 Hash params:', Object.fromEntries(hashParams.entries()));
        console.log('📊 Query params:', Object.fromEntries(queryParams.entries()));
        
        // The invite link should redirect here, so we need to process it properly
        // If this is being accessed directly from the Supabase redirect, it should work
        
        // Check for error first (when invite link expired or invalid)
        const error = hashParams.get('error') || queryParams.get('error');
        const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (error) {
          console.error('Invite link error:', { error, errorCode, errorDescription });
          
          // Handle specific error cases
          if (errorCode === 'otp_expired' || error.includes('expired')) {
            setError('This invite link has expired. Please request a new invitation.');
          } else if (errorCode === 'email_link_invalid' || error.includes('invalid')) {
            setError('This invite link is invalid or has already been used. Please request a new invitation.');
          } else {
            setError(decodeURIComponent(errorDescription || 'Invalid invite link. Please request a new invitation.'));
          }
          return;
        }

        // Get tokens from either source
        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
        const type = hashParams.get('type') || queryParams.get('type');

        // Check if this is a fresh invite link from Supabase (no tokens yet)
        if (!accessToken && !refreshToken) {
          console.log('📧 Fresh invite link detected, waiting for Supabase to process...');
          
          // Check if we have session already (user might already be logged in from invite)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (session && session.user) {
            console.log('✅ Existing session found, proceeding with user');
            await processUser(session.user);
            return;
          }
          
          // No session, wait for auth state change (this happens when Supabase processes the invite)
          let timeoutId: NodeJS.Timeout;
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session?.user) {
              console.log('✅ User signed in via invite');
              clearTimeout(timeoutId);
              subscription.unsubscribe();
              await processUser(session.user);
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              console.log('✅ Token refreshed for invite user');
              clearTimeout(timeoutId);
              subscription.unsubscribe();
              await processUser(session.user);
            }
          });
          
          // Set timeout for invite processing
          timeoutId = setTimeout(() => {
            console.error('⏰ Timeout waiting for invite to process');
            subscription.unsubscribe();
            setError('The invite link processing timed out. Please try clicking the link again or request a new invitation.');
            setLoading(false);
          }, 30000); // 30 second timeout
          
          return;
        }

        // We have tokens, process them directly
        if (accessToken) {
          console.log('🔑 Processing invite with existing tokens');
          
          // Handle session setup - try different methods based on available tokens
          let sessionResult;
          if (refreshToken) {
            console.log('🔑 Using setSession with both tokens');
            sessionResult = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
          } else {
            console.log('🔑 Using exchangeCodeForSession with access token only');
            sessionResult = await supabase.auth.exchangeCodeForSession(accessToken);
          }

          const { data, error: sessionError } = sessionResult;

          if (sessionError) {
            console.error('Session error:', sessionError);
            handleSessionError(sessionError);
            return;
          }

          if (data.user) {
            await processUser(data.user);
          } else {
            setError('No user found in invite');
          }
        } else {
          setError('Invalid invite link - no authentication tokens found');
        }
        
      } catch (err) {
        console.error('Error handling invite:', err);
        setError('An unexpected error occurred. Please try again or request a new invitation.');
      } finally {
        setLoading(false);
      }
    };

    const handleSessionError = (sessionError: any) => {
      if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
        setError('This invite link has expired. Please request a new invitation.');
      } else if (sessionError.message.includes('already been used')) {
        setError('This invite link has already been used. Please request a new invitation.');
      } else {
        setError('Failed to process invite link. Please try again or request a new invitation.');
      }
    };

    const processUser = async (user: any) => {
      try {
        console.log('✅ User authenticated successfully, checking profile...');
        
        // Check user profile and redirect
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (profileError) {
          console.error('Profile error:', profileError);
          // Use user metadata as fallback
          const role = user.user_metadata?.role || 'user';
          console.log('⚠️ Profile not found, using metadata role:', role);
          const dashboardMap = {
            admin: '/dashboard/admin',
            manager: '/dashboard/manager',
            user: '/dashboard/user'
          };
          navigate(dashboardMap[role] || '/dashboard/user');
          return;
        }
        
        console.log('👤 User profile:', profile);
        console.log('✅ Redirecting to dashboard');
        
        // Redirect to appropriate dashboard - use profile role or fall back to metadata
        const role = profile?.role || user.user_metadata?.role || 'user';
        const dashboardMap = {
          admin: '/dashboard/admin',
          manager: '/dashboard/manager',
          user: '/dashboard/user'
        };
        navigate(dashboardMap[role] || '/dashboard/user');
      } catch (err) {
        console.error('Error processing user:', err);
        setError('Failed to process user information. Please try again.');
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
