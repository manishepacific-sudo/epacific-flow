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
import { supabase } from "@/integrations/supabase/client";
import epacificLogo from "@/assets/epacific-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

      // Handle full auth response with session first (highest priority)
      if (authResponse?.user && authResponse?.session) {
        console.log('✅ Full auth success with session:', authResponse);
        toast({
          title: "Login successful",
          description: `Welcome back, ${authResponse.profile?.full_name}!`,
        });

        setTimeout(() => {
          switch (authResponse.profile?.role) {
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

      // For now, handle test response
      if (authResponse?.message === "Test success") {
        console.log('✅ Test success response:', authResponse);
        toast({
          title: "Test login successful",
          description: `Test mode: ${authResponse.name} (${authResponse.role})`,
        });
        
        // Redirect based on role for testing
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
    <AuthLayout>
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-md"
      >
        <GlassCard hover={false} className="p-8" glass={false}>
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
              <h1 className="text-2xl font-bold gradient-text mb-2">
                Welcome Back
              </h1>
              <p className="text-muted-foreground">
                Sign in to your account
              </p>
            </motion.div>
          </div>

          {/* Login Form */}
          <motion.form
            onSubmit={handleLogin}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 h-4 w-4 z-10" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60 h-4 w-4 z-10" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-background/50 border-border/50 focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors z-10"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>

          </motion.form>

          {/* Login Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 p-6 bg-muted/50 dark:bg-muted/30 rounded-xl border border-border"
          >
            <div className="mb-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Login Information
              </h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Use your Supabase authentication credentials to log in.</p>
              <p>Your dashboard will be displayed based on your assigned role.</p>
            </div>
          </motion.div>
        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
}