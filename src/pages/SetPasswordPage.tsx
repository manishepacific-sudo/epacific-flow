import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/AuthLayout';
import epacificLogo from '@/assets/epacific-logo.png';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbXh6dmh6eHNma2ZwbmJocGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjAzODAsImV4cCI6MjA3MzgzNjM4MH0.nW_hrwNdIwxFRsyR8RscM2LMcocEahIzExXIZIP-9Mo';
const FUNCTIONS_URL = 'https://nimxzvhzxsfkfpnbhphm.functions.supabase.co';

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
      const tokenFromUrl = searchParams.get('token');
      
      if (!tokenFromUrl) {
        toast({
          title: "Invalid invitation link",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tokenFromUrl)) {
        toast({
          title: "Invalid invitation link",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      setToken(tokenFromUrl);
      
      try {
        const response = await fetch(`${FUNCTIONS_URL}/set-password-with-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token: tokenFromUrl, validate_only: true })
        });
        
        if (!response.ok) {
          throw new Error('Validation failed');
        }

        const result = await response.json();
        
        if (!result.success) {
          toast({
            title: "Invalid invitation link",
            variant: "destructive"
          });
          navigate('/login');
          return;
        }
        
        setTokenValid(true);
      } catch (error) {
        toast({
          title: "Validation failed",
          variant: "destructive"
        });
        navigate('/login');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams, toast, navigate]);

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
        title: "Invalid invitation link",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive"
      });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast({
        title: "Password requirements not met",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${FUNCTIONS_URL}/set-password-with-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, password })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set password');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to set password');
      }

      toast({
        title: "Password set successfully",
      });
      
      navigate('/login');
    } catch (error: any) {
      toast({
        title: "Failed to set password",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
              <p className="text-muted-foreground">Please wait</p>
            </div>
          </GlassCard>
        </motion.div>
      </AuthLayout>
    );
  }

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

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
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
                      At least one special character
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {confirmPassword && password !== confirmPassword && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-600"
              >
                Passwords do not match
              </motion.div>
            )}

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
