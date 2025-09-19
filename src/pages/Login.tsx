import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Building2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import epacificLogo from "@/assets/epacific-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setDemoUser } = useAuth();

  // Demo admin credentials for quick access (dev only)
  const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('lovable');
  
  const handleDemoAdminLogin = async () => {
    setEmail('admin@demo.local');
    setPassword('Admin@123');
    // Trigger form submission after a short delay
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Attempting login for:', email);
      
      // Use our custom auth-login function that handles user creation
      console.log('🚀 Calling auth-login function...');
      const { data: authResponse, error: loginError } = await supabase.functions.invoke('auth-login', {
        body: { email, password }
      });

      console.log('📥 Edge function response:', { authResponse, loginError });

      if (loginError) {
        console.error('🔥 Edge function error:', loginError);
        toast({
          title: "Login failed",
          description: loginError.message || "Edge function error",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (authResponse?.error) {
        console.error('🚫 Auth response error:', authResponse.error);
        toast({
          title: "Login failed", 
          description: authResponse.error || "Invalid credentials",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Handle demo login response
      if (authResponse?.demo && authResponse?.message === "Demo login successful") {
        console.log('✅ Demo login response:', authResponse);
        
        // Set demo user in AuthProvider
        await setDemoUser(authResponse.email, authResponse.role, authResponse.name);
        
        toast({
          title: "Demo login successful",
          description: `Welcome ${authResponse.name} (${authResponse.role})`,
        });
        
        // Redirect based on role
        setTimeout(() => {
          switch (authResponse.role) {
            case 'admin':
              navigate('/dashboard/admin', { replace: true });
              break;
            case 'manager':
              navigate('/dashboard/manager', { replace: true });
              break;
            case 'user':
            default:
              navigate('/dashboard/user', { replace: true });
              break;
          }
          setLoading(false);
        }, 500);
        return;
      }

      // Handle full auth response (when we restore full functionality)
      if (authResponse?.user && authResponse?.profile) {
        console.log('✅ Full auth success:', authResponse);
        toast({
          title: "Login successful",
          description: `Welcome back, ${authResponse.profile.full_name}!`,
        });

        setTimeout(() => {
          switch (authResponse.profile.role) {
            case 'admin':
              navigate('/dashboard/admin', { replace: true });
              break;
            case 'manager':
              navigate('/dashboard/manager', { replace: true });
              break;
            case 'user':
            default:
              navigate('/dashboard/user', { replace: true });
              break;
          }
          setLoading(false);
        }, 500);
      } else {
        console.error('❌ Invalid response structure:', authResponse);
        toast({
          title: "Login failed",
          description: "Invalid response from server",
          variant: "destructive"
        });
        setLoading(false);
      }

    } catch (error: any) {
      console.error('Login catch error:', error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Demo accounts are pre-configured

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 md:p-12 shadow-2xl border border-white/10 relative overflow-hidden">
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h1 className="text-2xl font-bold text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-white/70">
                Sign in to your account
              </p>
            </motion.div>
          </div>

          {/* Login Form */}
          <motion.form
            onSubmit={handleLogin}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <Label htmlFor="email" className="text-white/90 text-sm font-medium">
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 z-10 transition-colors group-focus-within:text-white/80" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:bg-white/15 transition-all duration-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-white/90 text-sm font-medium">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4 z-10 transition-colors group-focus-within:text-white/80" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-2 focus:ring-white/20 focus:bg-white/15 transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/90 transition-all duration-300 z-10"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full bg-white/20 hover:bg-white/30 text-white border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-2 focus:ring-white/20"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </motion.div>

          </motion.form>

          {/* Demo Admin Quick Access (Dev Only) */}
          {isDev && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-4"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDemoAdminLogin}
                className="w-full bg-white/5 hover:bg-white/10 text-white/70 border-white/20 text-xs"
              >
                Quick Demo Admin Login (Dev)
              </Button>
            </motion.div>
          )}

          {/* Login Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl"
          >
            <div className="mb-3">
              <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Login Information
              </h3>
            </div>
            <div className="text-xs text-white/70 space-y-1">
              <p>Use your invitation credentials to sign in.</p>
              <p>First-time users will be redirected to set their password.</p>
            </div>
          </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}