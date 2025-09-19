import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Building2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Get user profile to determine role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', data.user.id)
          .single();

        toast({
          title: "Login successful",
          description: `Welcome back, ${profile?.full_name || 'User'}!`,
        });
        
        // Redirect based on role
        switch (profile?.role) {
          case "admin":
            navigate("/dashboard/admin");
            break;
          case "manager":
            navigate("/dashboard/manager");
            break;
          case "user":
          default:
            navigate("/dashboard/user");
            break;
        }
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 glass-button"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 glass-button"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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

          {/* Demo Credentials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Demo Access
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong className="text-gray-900">User:</strong> john.doe@epacific.com / password123</p>
              <p><strong className="text-gray-900">Manager:</strong> jane.manager@epacific.com / password123</p>
              <p><strong className="text-gray-900">Admin:</strong> admin@epacific.com / password123</p>
            </div>
          </motion.div>
        </GlassCard>
      </motion.div>
    </AuthLayout>
  );
}