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
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (!accessToken || type !== 'invite') {
          setError('Invalid invite link');
          return;
        }

        // Always set session with tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to process invite link');
          return;
        }

        if (data.user) {
          // Redirect to set password page with tokens
          navigate(
            `/set-password#access_token=${accessToken}&refresh_token=${refreshToken || ''}&email=${encodeURIComponent(data.user.email)}`
          );
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
