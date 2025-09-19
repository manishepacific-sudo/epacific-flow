import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import epacificLogo from "@/assets/epacific-logo.png";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get current session to check if user is signed in via magic link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
        
        // Check if password is already set
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_set')
          .eq('user_id', session.user.id)
          .single();
        
        if (profile?.password_set) {
          toast({
            title: "Password already set",
            description: "Redirecting to login page",
          });
          navigate('/login');
        }
      } else {
        toast({
          title: "Session expired",
          description: "Please click the invitation link again",
          variant: "destructive"
        });
        navigate('/login');
      }
    };

    checkSession();
  }, [navigate, toast]);

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasLetter: /[a-zA-Z]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(checks).every(Boolean);
    return { isValid, checks };
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are identical",
        variant: "destructive"
      });
      return;
    }

    const { isValid } = validatePassword(password);
    if (!isValid) {
      toast({
        title: "Password requirements not met",
        description: "Please ensure your password meets all requirements",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Update the profile to mark password as set
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password_set: true })
          .eq('user_id', user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
          // Don't throw - password was set successfully
        }
      }

      toast({
        title: "Password set successfully",
        description: "You can now sign in with your email and password",
      });

      // Sign out the user so they can log in normally
      await supabase.auth.signOut();
      
      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 1000);

    } catch (error: any) {
      console.error('Set password error:', error);
      toast({
        title: "Failed to set password",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const { checks } = validatePassword(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="backdrop-blur-lg bg-white/10 border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl"></div>
          <div className="relative z-10">
            
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 200, 
                  damping: 20,
                  delay: 0.2 
                }}
                className="mb-6"
              >
                <img 
                  src={epacificLogo} 
                  alt="Epacific Technologies" 
                  className="w-20 h-20 mx-auto rounded-2xl shadow-2xl"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h1 className="text-2xl font-bold text-white mb-2">
                  Set Your Password
                </h1>
                <p className="text-white/70 text-sm">
                  Welcome! Please create a secure password for your account
                </p>
                {userEmail && (
                  <p className="text-white/60 text-xs mt-1">{userEmail}</p>
                )}
              </motion.div>
            </div>

            <motion.form
              onSubmit={handleSetPassword}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <Label htmlFor="password" className="text-white/90 text-sm">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 z-10" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-white/90 text-sm">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 z-10" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors z-10"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {password && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white/5 border border-white/10 rounded-lg p-4"
                >
                  <h4 className="text-white/90 text-sm font-medium mb-3">Password Requirements:</h4>
                  <div className="space-y-2">
                    {[
                      { label: "At least 8 characters", met: checks.length },
                      { label: "Contains a number", met: checks.hasNumber },
                      { label: "Contains a letter", met: checks.hasLetter },
                      { label: "Contains a special character", met: checks.hasSpecial }
                    ].map((requirement, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle 
                          className={`h-4 w-4 ${
                            requirement.met ? 'text-green-400' : 'text-white/40'
                          }`}
                        />
                        <span 
                          className={`text-xs ${
                            requirement.met ? 'text-white/90' : 'text-white/60'
                          }`}
                        >
                          {requirement.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20 transition-all duration-300 focus:ring-2 focus:ring-white/20"
                size="lg"
                disabled={loading || !validatePassword(password).isValid || password !== confirmPassword}
              >
                {loading ? "Setting Password..." : "Set Password & Continue"}
              </Button>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}