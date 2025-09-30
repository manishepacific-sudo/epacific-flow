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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    console.log("=== SetPasswordPage DEBUG START ===");
    console.log("🚀 SetPasswordPage component mounted");
    console.log("🔍 Full URL:", window.location.href);
    console.log("🔍 Search params:", window.location.search);
    
    // Extract token from URL using multiple methods for reliability
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromWindow = urlParams.get('token');
    const tokenFromSearchParams = searchParams.get('token');
    
    // Try both methods and use whichever works
    const tokenFromUrl = tokenFromSearchParams || tokenFromWindow;
    
    console.log("🎫 Token from useSearchParams:", tokenFromSearchParams || "MISSING");
    console.log("🎫 Token from window.location:", tokenFromWindow || "MISSING");
    console.log("🎯 Final token:", tokenFromUrl || "MISSING");

    if (!tokenFromUrl) {
      console.error("❌ No token found in URL parameters");
      console.log("🔍 Debugging info:");
      console.log("  - Current pathname:", window.location.pathname);
      console.log("  - Current search:", window.location.search);
      console.log("  - Current hash:", window.location.hash);
      console.log("  - All params:", Object.fromEntries(searchParams.entries()));
      
      setError("Invalid invitation link - please use the link from your email");
      setIsValidating(false);
      toast({
        title: "Missing invitation token",
        description: "Please use the complete link from your invitation email",
        variant: "destructive"
      });
      return;
    }

    // Basic token format validation (UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tokenFromUrl)) {
      console.error("❌ Token format invalid:", tokenFromUrl);
      setError("Invalid invitation link - invalid token format");
      setIsValidating(false);
      toast({
        title: "Invalid token format",
        description: "Please use the link from your invitation email",
        variant: "destructive"
      });
      return;
    }

    console.log("✅ Token found and validated, setting in state");
    
    // Now validate token exists in database
    validateTokenInDatabase(tokenFromUrl);
    console.log("=== SetPasswordPage DEBUG END ===");
  }, [searchParams, toast]);

  const validateTokenInDatabase = async (tokenFromUrl: string) => {
    console.log("🔍 Starting database token validation for:", tokenFromUrl);
    
    try {
      // Create a fresh Supabase client for this request
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        "https://nimxzvhzxsfkfpnbhphm.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbXh6dmh6eHNma2ZwbmJocGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjAzODAsImV4cCI6MjA3MzgzNjM4MH0.nW_hrwNdIwxFRsyR8RscM2LMcocEahIzExXIZIP-9Mo"
      );
      
      console.log("📡 Querying invite_tokens table for token:", tokenFromUrl);
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('invite_tokens')
        .select('*')
        .eq('token', tokenFromUrl)
        .eq('used', false)
        .maybeSingle();
      
      console.log("📊 Database query result:", {
        found: !!tokenData,
        error: tokenError?.message,
        tokenId: tokenData?.id,
        email: tokenData?.email,
        used: tokenData?.used,
        expires_at: tokenData?.expires_at,
        created_at: tokenData?.created_at
      });
      
      if (tokenError) {
        console.error("❌ Database query error:", tokenError);
        setError(`Database error: ${tokenError.message}`);
        setIsValidating(false);
        toast({
          title: "Database error",
          description: `Failed to validate token: ${tokenError.message}`,
          variant: "destructive"
        });
        return;
      }
      
      if (!tokenData) {
        console.error("❌ Token not found in database");
        setError("This invitation link is invalid or has expired. The token was not found in the database.");
        setIsValidating(false);
        toast({
          title: "Token not found",
          description: "This invitation link is not valid. Please request a new invitation.",
          variant: "destructive"
        });
        return;
      }
      
      // Check expiration
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      console.log("⏰ Expiration check:", {
        expires: expiresAt.toISOString(),
        now: now.toISOString(),
        isExpired: expiresAt < now
      });
      
      if (expiresAt < now) {
        console.error("❌ Token has expired");
        setError("This invitation link has expired. Please request a new invitation.");
        setIsValidating(false);
        toast({
          title: "Invitation expired",
          description: "This invitation link has expired. Please request a new invitation.",
          variant: "destructive"
        });
        return;
      }
      
      console.log("✅ Token validation successful!");
      setToken(tokenFromUrl);
      setError(null);
      setIsValidating(false);
      
    } catch (err: any) {
      console.error("❌ Token validation error:", err);
      setError(`Validation failed: ${err.message}`);
      setIsValidating(false);
      toast({
        title: "Validation error",
        description: `Failed to validate token: ${err.message}`,
        variant: "destructive"
      });
    }
  };
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
      console.log("🔍 First, let's validate the token exists in database...");
      
      // Create a Supabase client for token validation (this doesn't require auth)
      const supabaseClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      // Try to validate token exists in database first
      const { data: tokenCheck, error: tokenCheckError } = await supabaseClient
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .single();
      
      console.log("🔍 Token validation result:", { 
        found: !!tokenCheck, 
        error: tokenCheckError?.message,
        tokenData: tokenCheck ? {
          id: tokenCheck.id,
          email: tokenCheck.email,
          used: tokenCheck.used,
          expires_at: tokenCheck.expires_at
        } : null
      });
      
      if (tokenCheckError || !tokenCheck) {
        console.error("❌ Token not found in database:", tokenCheckError);
        setError("This invitation link is invalid or has expired. Please request a new invitation.");
        setLoading(false);
        return;
      }
      
      // Check if token has expired
      const expiresAt = new Date(tokenCheck.expires_at);
      const now = new Date();
      if (expiresAt < now) {
        console.error("❌ Token has expired:", { expires: expiresAt, now });
        setError("This invitation link has expired. Please request a new invitation.");
        setLoading(false);
        return;
      }
      
      console.log("✅ Token validation passed, proceeding with password update...");
      
      console.log("📡 Calling set-password-with-token edge function...");
      const { data, error } = await supabase.functions.invoke('set-password-with-token', {
        body: {
          token,
          password: formData.password,
        },
      });

      console.log("📊 Edge function response:", { data, error });

      if (error) {
        console.error("❌ Edge function error:", error);
        toast({
          title: "Failed to set password",
          description: `Edge function error: ${error.message}. Please try again or contact support.`,
          variant: "destructive"
        });
        return;
      }

      if (!data?.success) {
        console.error("❌ Edge function returned failure:", data);
        toast({
          title: "Failed to set password",
          description: `Server error: ${data?.error || 'Unknown error'}. Please try again or contact support.`,
          variant: "destructive"
        });
        return;
      }

      console.log("✅ Password updated successfully via edge function");
      toast({
        title: "Password set successfully – you can now log in with your new password"
      });
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Error setting password:', err);
      
      // Provide more detailed error information
      let errorMessage = err.message || "Please try again or contact support";
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Please check your internet connection and try again.";
      } else if (err.message?.includes('token')) {
        errorMessage = "Token validation failed. The invitation link may be invalid or expired.";
      }
      
      toast({
        title: "Failed to set password",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <GlassCard className="p-8" glass>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Validating invitation link...</p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Show error state if there's an issue with the token
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <GlassCard className="p-8" glass>
            <h1 className="text-2xl font-bold mb-4 text-destructive">Invalid Invitation Link</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-4">
              <p className="text-sm font-medium">Troubleshooting steps:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Make sure you're using the complete link from your invitation email</li>
                <li>• Check if the invitation link has expired (links expire after 24 hours)</li>
                <li>• Try copying and pasting the entire URL into your browser</li>
                <li>• Contact your administrator for a new invitation if the link has expired</li>
              </ul>
              <div className="pt-4 space-y-2">
                <Button onClick={() => navigate('/login')} className="w-full" variant="outline">
                  Go to Login Page
                </Button>
                <Button onClick={() => window.location.reload()} className="w-full">
                  Reload Page
                </Button>
              </div>
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
