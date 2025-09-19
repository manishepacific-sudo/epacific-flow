import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import epacificLogo from "@/assets/epacific-logo.png";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid invitation",
        description: "This invitation link is invalid or expired",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    // Get user info from token (this would typically come from a more secure method)
    fetchUserInfo();
  }, [token, navigate, toast]);

  const fetchUserInfo = async () => {
    try {
      // In a real implementation, you'd verify the token server-side
      // For now, we'll just show a generic setup form
      setUserEmail("user@example.com"); // This would come from token verification
    } catch (error) {
      console.error('Error fetching user info:', error);
      toast({
        title: "Error",
        description: "Failed to load invitation details",
        variant: "destructive"
      });
      navigate('/login');
    }
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    
    return {
      isValid: minLength && hasNumber && hasLetter,
      errors: [
        !minLength && "Password must be at least 8 characters",
        !hasNumber && "Password must contain at least one number",
        !hasLetter && "Password must contain at least one letter"
      ].filter(Boolean)
    };
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        description: validation.errors.join(", "),
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // In a real implementation, you'd update the user's password via a secure API
      // For now, we'll simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Password set successfully",
        description: "You can now log in with your new password",
      });

      navigate('/login');
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Failed to set password",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                damping: 20,
                delay: 0.4 
              }}
              className="mb-6"
            >
              <img 
                src={epacificLogo} 
                alt="Epacific Technologies" 
                className="w-24 h-24 mx-auto rounded-2xl shadow-glow dark:bg-white dark:p-2"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Set Your Password
              </h1>
              <p className="text-gray-600">
                Create a secure password for your account
              </p>
            </motion.div>
          </div>

          {/* Set Password Form */}
          <motion.form
            onSubmit={handleSetPassword}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
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
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
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
                    <CheckCircle className={`h-4 w-4 ${password.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={password.length >= 8 ? 'text-green-700' : 'text-gray-500'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${/\d/.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={/\d/.test(password) ? 'text-green-700' : 'text-gray-500'}>
                      At least one number
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`h-4 w-4 ${/[a-zA-Z]/.test(password) ? 'text-green-500' : 'text-gray-300'}`} />
                    <span className={/[a-zA-Z]/.test(password) ? 'text-green-700' : 'text-gray-500'}>
                      At least one letter
                    </span>
                  </div>
                </div>
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