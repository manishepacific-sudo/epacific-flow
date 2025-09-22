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

    if (formData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters long", variant: "destructive" });
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
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-12 py-3 bg-card/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter new password"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && formData.password.length < 6 && (
                <p className="text-xs text-destructive">Password must be at least 6 characters long</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 pr-12 py-3 bg-card/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Confirm new password"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={loading || formData.password.length < 6 || formData.password !== formData.confirmPassword}
              className="w-full py-3 px-4 bg-gradient-primary text-primary-foreground rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-300"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Setting Password...
                </div>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
