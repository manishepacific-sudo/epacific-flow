import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        throw error;
      }

      if (data.user) {
        // Check user profile and redirect accordingly
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, password_set, is_demo, full_name')
          .eq('user_id', data.user.id)
          .single();

        if (profile && !profile.password_set) {
          navigate('/set-password');
        } else if (profile) {
          // Show appropriate welcome message based on user type
          if (profile.is_demo) {
            toast({
              title: "Demo login successful",
              description: `Welcome to the ${profile.role} demo, ${profile.full_name}!`,
            });
          } else {
            toast({
              title: "Welcome back!",
              description: `Hello ${profile.full_name}, you have been successfully logged in.`,
            });
          }

          switch (profile.role) {
            case 'admin':
              navigate('/dashboard/admin');
              break;
            case 'manager':
              navigate('/dashboard/manager');
              break;
            default:
              navigate('/dashboard/user');
              break;
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@epacific.com',
        password: 'admin123',
      });

      if (error) throw error;

      // Fetch profile to show correct demo message
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, is_demo')
        .eq('user_id', data.user.id)
        .single();

      toast({
        title: "Demo login successful",
        description: `Welcome to the ${profile?.role || 'admin'} demo, ${profile?.full_name || 'Admin'}!`,
      });
      
      navigate('/dashboard/admin');
    } catch (error: any) {
      toast({
        title: "Demo login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Login form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-6 relative z-10"
      >
        <GlassCard className="p-8" glass>
          {/* Logo and title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-glow">
              <LogIn className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to access your dashboard</p>
          </motion.div>

          {/* Login form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            onSubmit={handleLogin}
            className="space-y-6"
          >
            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-card/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-card/50 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Login button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 px-4 bg-gradient-primary text-primary-foreground rounded-xl font-medium shadow-glow hover:shadow-lg transition-all duration-300 ${
                loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>

            {/* Demo login button */}
            <motion.button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 glass-button text-foreground rounded-xl font-medium hover:bg-card/20 transition-all duration-300"
            >
              Quick Demo Login (Admin)
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            <p>Secure access powered by Supabase</p>
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
}