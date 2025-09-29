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
      // Get custom token from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const customToken = urlParams.get('token');
      
      if (customToken) {
        console.log('✅ Custom token found:', customToken);
        // Verify custom token and get user data
        const { data, error } = await supabase
          .from('invite_tokens')
          .select('*')
          .eq('token', customToken)
          .eq('used', false)
          .single();
          
        if (error || !data) {
          console.error('❌ Invalid or expired token:', error);
          setError('Invalid or expired invitation link. Please request a new invitation.');
          return;
        }
        
        // Check if token has expired
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          console.error('❌ Token expired');
          setError('This invitation link has expired. Please request a new invitation.');
          return;
        }
        
        setInviteData({
          email: data.email,
          token: customToken,
          userData: data.user_data
        });
        return;
      }
      
      // Check both hash and query params for invitation flows (legacy support)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlEmail = hashParams.get('email') || urlParams.get('email');
      const urlAccessToken = hashParams.get('access_token') || urlParams.get('access_token');
      
      // Then check if user is authenticated
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        console.log('✅ Session found, user:', session.user.email);
        // Check if user profile exists and password status
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_set, role')
          .eq('user_id', session.user.id)
          .single();
          
        if (profile && profile.password_set) {
          console.log('✅ Password already set, redirecting to dashboard');
          // User already has password set, redirect to appropriate dashboard
          const dashboardMap = {
            admin: '/dashboard/admin',
            manager: '/dashboard/manager',
            user: '/dashboard/user'
          };
          navigate(dashboardMap[profile.role] || '/dashboard/user', { replace: true });
          return;
        }
        
        setInviteData({ 
          email: session.user.email,
          userId: session.user.id 
        });
        return;
      }
      
      if (!urlEmail && !customToken) {
        console.log('❌ No session, token, or email in URL');
        setError('Invalid invitation link - please use the link from your email');
        return;
      }
      
      console.log('❌ No session found, using URL params for invitation');
      setInviteData({ email: urlEmail, accessToken: urlAccessToken });
    };
    
    checkAuth();
  }, [navigate]);

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
      // Handle custom token flow
      if (inviteData.token) {
        // Verify token is still valid
        const { data: tokenData, error: tokenError } = await supabase
          .from('invite_tokens')
          .select('*')
          .eq('token', inviteData.token)
          .eq('used', false)
          .single();
          
        if (tokenError || !tokenData) {
          throw new Error('Invalid or expired invitation token');
        }
        
        const userData = tokenData.user_data as any;
        
        // Update user password
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userData.user_id,
          { password: formData.password }
        );
        
        if (authError) throw authError;
        
        // Mark token as used
        await supabase.from('invite_tokens').update({ used: true }).eq('token', inviteData.token);
        
        // Update profile to mark password as set
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password_set: true })
          .eq('user_id', userData.user_id);
          
        if (profileError) {
          console.warn('Failed to update profile password_set flag:', profileError);
        }
        
        toast({ title: "Password set successfully! You can now login." });
        navigate('/login', { replace: true });
        return;
      }
      
      // Handle existing session flow
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
