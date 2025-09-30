import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CircleCheck as CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/AuthLayout';
import epacificLogo from '@/assets/epacific-logo.png';

// Determine the correct Supabase Functions URL
const projectRef = 'nimxzvhzxsfkfpnbhphm'; // Your Supabase project reference
const functionsUrl = `https://${projectRef}.functions.supabase.co`;

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      console.log('🔍 Starting token validation...');
      
      // 1. Read token from URL query param
      const tokenFromUrl = searchParams.get('token');
      console.log('🎫 Token from URL:', tokenFromUrl ? `${tokenFromUrl.substring(0, 8)}...` : 'MISSING');
      
      // 2. If no token found, show error and redirect
      if (!tokenFromUrl) {
        console.error('❌ No token found in URL');
        toast({
          title: "Invalid invitation link – please use the link from your email",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tokenFromUrl)) {
        console.error('❌ Invalid token format:', tokenFromUrl);
        toast({
          title: "Invalid invitation link – please use the link from your email",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      setToken(tokenFromUrl);
      
      // 3. Validate token with edge function
      try {
        console.log('🔍 Validating token via edge function...');
        
        const functionUrl = `${functionsUrl}/set-password-with-token`;
        
        console.log('📡 Edge function URL:', functionUrl);
        console.log('🎫 Validating token:', tokenFromUrl.substring(0, 8) + '...');
        
        // Prepare request body for validation
        const requestBody = { 
          token: tokenFromUrl, 
          validate_only: true 
        };
        console.log('📤 Validation request body:', requestBody);
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbXh6dmh6eHNma2ZwbmJocGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjAzODAsImV4cCI6MjA3MzgzNjM4MH0.nW_hrwNdIwxFRsyR8RscM2LMcocEahIzExXIZIP-9Mo`,
            'x-client-info': 'supabase-js-set-password-page',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📊 Validation response status:', response.status);
        console.log('📊 Validation response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Validation failed with status:', response.status, 'Body:', errorText);
          throw new Error(`Validation failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('📊 Validation result:', result);
        
        if (!result.success) {
          console.error('❌ Token validation failed:', result.error);
          toast({
            title: "Invalid invitation link",
            description: result.error || "Please use the link from your email",
            variant: "destructive"
          });
          navigate('/login');
          return;
        }
        
        console.log('✅ Token validation successful');
        setTokenValid(true);
        
      } catch (error: any) {
        console.error('❌ Token validation error:', error);
        toast({
          title: "Validation failed",
          description: "Unable to validate invitation link. Please try again or contact support.",
          variant: "destructive"
        });
        navigate('/login');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams, toast, navigate]);

  useEffect(() => {
    // Original token extraction logic (kept for compatibility)
    const tokenFromUrl = searchParams.get('token');
    
    // 2. If no token found, show error and redirect
    if (!tokenFromUrl) {
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tokenFromUrl)) {
      toast({
        title: "Invalid invitation link – please use the link from your email",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!token) {
      setToken(tokenFromUrl);
      console.log(`🎫 Token extracted from URL: ${tokenFromUrl.substring(0, 8)}...`);
    }
  }, [searchParams, toast, navigate, token]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: minLength && hasNumber && hasLetter && hasSpecialChar,
      checks: {
        minLength,
        hasNumber,
        hasLetter,
        hasSpecialChar,
      }
    };
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

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure your password meets all requirements",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const functionUrl = `${functionsUrl}/set-password-with-token`;
      
      console.log(`🔐 Setting password with token: ${token.substring(0, 8)}...`);
      console.log('📤 Sending POST request to edge function...');
      
      const requestBody = { token, password };
      console.log('📤 Request body:', { ...requestBody, password: '[REDACTED]' });
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbXh6dmh6eHNma2ZwbmJocGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjAzODAsImV4cCI6MjA3MzgzNjM4MH0.nW_hrwNdIwxFRsyR8RscM2LMcocEahIzExXIZIP-9Mo`,
          'x-client-info': 'supabase-js-set-password-page',
        },
        body: JSON.stringify(requestBody)
      }).catch(fetchError => {
        console.error('🌐 Fetch failed:', fetchError);
        throw new Error(`Network error: ${fetchError.message}`);
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read response');
        console.error('❌ HTTP error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json().catch(jsonError => {
        console.error('❌ JSON parse error:', jsonError);
        throw new Error('Invalid response format from server');
      });
      console.log('📊 Edge function response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to set password');
      }

      // 4. Success → show success toast and redirect to login
      toast({
        title: "Password set successfully – you can now log in with your new password",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('❌ Error setting password:', error);
      console.error('❌ Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // 5. Error → show error toast
      toast({
        title: "Failed to set password",
        description: error.message || "Please use the link from your email or contact support",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating token
  if (validatingToken) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <GlassCard hover={false} className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Validating Invitation...</h2>
              <p className="text-muted-foreground">Please wait while we verify your invitation link</p>
            </div>
          </GlassCard>
        </motion.div>
      </AuthLayout>
    );
  }

  // Don't render form if token is invalid (will redirect)
  if (!token || !tokenValid) {
    return null;
  }

  const validation = validatePassword(password);

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <GlassCard hover={false} className="p-8">
          {/* Logo and Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <img 
                src={epacificLogo} 
                alt="Epacific Technologies" 
                className="w-full h-full object-contain rounded-2xl shadow-glow dark:bg-white dark:p-2"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Set Your Password
            </h1>
            <p className="text-gray-600">
              Create a secure password for your new account
            </p>
          </motion.div>

          {/* Password Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${validation.checks.minLength ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={validation.checks.minLength ? 'text-green-700' : 'text-gray-500'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${validation.checks.hasNumber ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={validation.checks.hasNumber ? 'text-green-700' : 'text-gray-500'}>
                      At least one number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${validation.checks.hasLetter ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={validation.checks.hasLetter ? 'text-green-700' : 'text-gray-500'}>
                      At least one letter
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${validation.checks.hasSpecialChar ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={validation.checks.hasSpecialChar ? 'text-green-700' : 'text-gray-500'}>
                      At least one special character (!@#$%^&*...)
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Password Mismatch Warning */}
            {confirmPassword && password !== confirmPassword && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600"
              >
                Passwords do not match
              </motion.div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !validation.isValid || password !== confirmPassword}
            >
              {loading ? "Setting Password..." : "Set Password"}
            </Button>
          </motion.form>
        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
}