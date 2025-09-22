import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // First check if user is authenticated
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('❌ No session found, checking URL params');
        // Fallback to checking URL params if no session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const email = hashParams.get('email');
        const accessToken = hashParams.get('access_token');
        
        if (!email) {
          setError('Invalid invitation link - please use the link from your email');
          return;
        }
        
        setInviteData({ email, accessToken });
        return;
      }
      
      console.log('✅ Session found, user:', session.user.email);
      setInviteData({ 
        email: session.user.email,
        userId: session.user.id 
      });
    };
    
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteData) return;

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (formData.password.length < 8) {
      toast({ title: "Password too short", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // If user has session, update password directly
      if (inviteData.userId) {
        const { error } = await supabase.auth.updateUser({
          password: formData.password
        });
        
        if (error) throw error;
        
        // Update profile to mark password as set
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password_set: true })
          .eq('user_id', inviteData.userId);
          
        if (profileError) {
          console.warn('Failed to update profile password_set flag:', profileError);
        }
      } else {
        // Fallback to using edge function if no session
        if (!inviteData.accessToken) {
          throw new Error('Invalid invitation link - missing access token');
        }
        
        const { data, error } = await supabase.functions.invoke('setup-password', {
          body: {
            token: inviteData.accessToken,
            email: inviteData.email,
            password: formData.password
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);
      }

      toast({ title: "Password set successfully!" });
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Error setting password:', err);
      toast({ title: "Failed to set password", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">{error}</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <GlassCard className="p-8" glass>
          <h1 className="text-2xl font-bold mb-4">Set Your Password</h1>
          <p className="text-muted-foreground mb-6">{inviteData?.email}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Setting..." : "Set Password"}
            </Button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
