import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setDemoUser: (email: string, role: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  setDemoUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Initialize session timeout hook
  useSessionTimeout();

  const setDemoUser = async (email: string, role: string, name: string) => {
    // This function is kept for compatibility but no longer used
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          // Clear invalid session data
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Fetch profile with role
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (mounted) {
              setProfile(profile);
            }
          } catch (error) {
            // Error handled silently - profile will remain null
          }
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
        
      } catch (error) {
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up Supabase auth state listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          setProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Fetch profile with role
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (mounted) {
                setProfile(profile);
              }
            } catch (error) {
              // Error handled silently - profile will remain null
            }
          }, 0);
        }
        
        if (mounted) {
          setLoading(false);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Sign out from Supabase client
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      navigate('/login');
    } catch (error) {
      // Force navigation even if logout fails
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, setDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
}