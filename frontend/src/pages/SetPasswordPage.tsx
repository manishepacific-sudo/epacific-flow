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
  // CRITICAL: Add immediate alert to see if component loads
  alert("CRITICAL DEBUG: SetPasswordPage component is loading!");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // CRITICAL: Add alerts for debugging in incognito mode
    alert("DEBUG: SetPasswordPage mounted. URL: " + window.location.href);
    
    console.log("=== SetPasswordPage DEBUG START ===");
    console.log("🚀 SetPasswordPage component mounted");
    console.log("🔍 window.location.href:", window.location.href);
    console.log("🔍 window.location.search:", window.location.search);
    console.log("🔍 window.location.pathname:", window.location.pathname);
    console.log("🔍 window.location.hash:", window.location.hash);
    console.log("🔍 URLSearchParams from location.search:", new URLSearchParams(window.location.search));
    console.log("🔍 All searchParams entries:", Object.fromEntries(searchParams.entries()));

    // Multiple ways to extract token for debugging
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromWindow = urlParams.get('token');
    const tokenFromSearchParams = searchParams.get('token');
    
    console.log("🎫 Token from window.location.search:", tokenFromWindow || "MISSING");
    console.log("🎫 Token from useSearchParams:", tokenFromSearchParams || "MISSING");
    console.log("🎯 Expected token: 3c31cc3d-5423-4009-a953-41eb3c5435b7");
    
    // Alert for critical debugging
    alert("DEBUG: Token from URL: " + (tokenFromWindow || "MISSING") + " | From searchParams: " + (tokenFromSearchParams || "MISSING"));
    
    // Use whichever method works
    const tokenFromUrl = tokenFromSearchParams || tokenFromWindow;

    if (!tokenFromUrl) {
      console.error("❌ No token found in URL parameters");
      setError("Invalid invitation link – please use the link from your email");
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
      setError("Invalid invitation link – invalid token format");
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      return;
    }

    console.log("✅ Token found and format validated, setting in state");
    setToken(tokenFromUrl);
    setError(null); // Clear any previous errors
    console.log("=== SetPasswordPage DEBUG END ===");
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

  // Show error state if there's an issue with the token
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <GlassCard className="p-8" glass>
            <h1 className="text-2xl font-bold mb-4 text-destructive">Debugging Token Issue</h1>
            <div className="space-y-4 text-sm">
              <div><strong>Error:</strong> {error}</div>
              <div><strong>Current URL:</strong> {window.location.href}</div>
              <div><strong>Search params:</strong> {window.location.search}</div>
              <div><strong>Token from searchParams:</strong> {searchParams.get('token') || 'NOT FOUND'}</div>
              <div><strong>Expected token:</strong> 3c31cc3d-5423-4009-a953-41eb3c5435b7</div>
              <div><strong>All params:</strong></div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
              </pre>
              <div><strong>Manual token check:</strong> {new URLSearchParams(window.location.search).get('token') || 'NOT FOUND'}</div>
            </div>
            <div className="mt-6 space-y-4">
              <p className="text-sm">Troubleshooting steps:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Make sure you're using the complete link from your email</li>
                <li>• Check if the link has expired</li>
                <li>• Try copying and pasting the entire URL</li>
                <li>• Contact your administrator for a new invitation</li>
              </ul>
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Page
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

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
