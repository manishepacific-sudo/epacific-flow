import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
        // Parse URL hash fragments (Supabase uses # not ? for invite tokens)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (!accessToken || !refreshToken || type !== 'invite') {
          setError('Invalid invite link');
          return;
        }

        // Set the session with the tokens from the invite link
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to process invite link');
          return;
        }

        if (data.user) {
          // Check if password is already set
          const { data: profile } = await supabase
            .from('profiles')
            .select('password_set')
            .eq('user_id', data.user.id)
            .single();

          if (profile?.password_set) {
            // User already set password, redirect to appropriate dashboard
            navigate('/dashboard/user');
          } else {
            // Redirect to set password page
            navigate('/set-password');
          }
        } else {
          setError('No user found in invite');
        }
      } catch (err) {
        console.error('Error handling invite:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleInviteLink();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <GlassCard className="p-8" glass>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Processing your invite...</h2>
            <p className="text-muted-foreground">Please wait while we set up your account.</p>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <GlassCard className="p-8" glass>
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-destructive">Invite Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="glass-button px-4 py-2 text-primary hover:text-primary-foreground"
            >
              Go to Login
            </button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return null;
}