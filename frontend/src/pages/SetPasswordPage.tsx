import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AuthLayout from '@/components/AuthLayout';
import epacificLogo from '@/assets/epacific-logo.png';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Extract token from URL query parameters
    const tokenFromUrl = searchParams.get('token');
    
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

    setToken(tokenFromUrl);
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
      // Call the edge function with token and password
      const { data, error } = await supabase.functions.invoke('set-password-with-token', {
        body: {
          token,
          password,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to set password');
      }

      // Success - redirect to login
      toast({
        title: "Password set successfully – you can now log in with your new password",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Failed to set password",
        description: error.message || "Please try again or contact support",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if no token (will redirect)
  if (!token) {
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
                      At least one special character
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