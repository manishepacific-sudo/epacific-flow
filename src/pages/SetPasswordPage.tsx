import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function SetPasswordPage() {
  useEffect(() => {
  console.log("🚀 SetPasswordPage component mounted");
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 Search params:", window.location.search);
  
  // Read token from URL query parameters - case-sensitive "token"
  const tokenFromUrl = searchParams.get('token');
  console.log("🎫 Token from URL:", tokenFromUrl ? `${tokenFromUrl.substring(0, 8)}...` : "MISSING");
  
  // ... rest of your token validation code ...
}, [searchParams, toast]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    console.log("🚀 SetPasswordPage component mounted");
    console.log("🔍 Current URL:", window.location.href);
    console.log("🔍 Search params:", window.location.search);
    
    // Read token from URL query parameters - case-sensitive "token"
    const tokenFromUrl = searchParams.get('token');
    console.log("🎫 Token from URL:", tokenFromUrl ? `${tokenFromUrl.substring(0, 8)}...` : "MISSING");
    
    if (!tokenFromUrl) {
      console.error("❌ No token found in URL parameters");
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      return;
    }
    
    // Basic token format validation (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tokenFromUrl)) {
      console.error("❌ Token format invalid:", tokenFromUrl);
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      return;
    }
    
    console.log("✅ Token found and format validated, setting in state");
    setToken(tokenFromUrl);
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (formData.password.length < 6) {
      toast({ title: "Password must be at least 6 characters long", variant: "destructive" });
      return;
    }

    setLoading(true);
    console.log("🔄 Starting password set process...");
    console.log("🎫 Using token:", token ? `${token.substring(0, 8)}...` : "MISSING");

    try {
      console.log("📡 Calling set-password-with-token edge function...");
      const { data, error } = await supabase.functions.invoke('set-password-with-token', {
        body: {
          token,
          password: formData.password,
        },
      });
      
      console.log("📊 Edge function response:", { data, error });

      if (error) {
        toast({
          title: "Failed to set password",
          description: error.message || "Please try again or contact support",
          variant: "destructive"
        });
        return;
      }

      if (!data?.success) {
        toast({
          title: "Failed to set password",
          description: data?.error || "Please try again or contact support",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Password set successfully – you can now log in with your new password"
      });
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Error setting password:', err);
      toast({
        title: "Failed to set password",
        description: err.message || "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <GlassCard className="p-8" glass>
          <h1 className="text-2xl font-bold mb-4">Set Your Password</h1>
          <p className="text-muted-foreground mb-6">
            Please create a secure password for your account
            {process.env.NODE_ENV === 'development' && token && (
              <><br /><small className="text-xs opacity-60">Token: {token.substring(0, 8)}...</small></>
            )}
          </p>

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
