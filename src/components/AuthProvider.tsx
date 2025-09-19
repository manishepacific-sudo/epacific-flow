import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
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

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Try to restore session from HttpOnly cookies via our secure endpoint
        const { data: sessionData, error } = await supabase.functions.invoke('session-verify');
        
        if (!mounted) return;

        if (error || sessionData?.error) {
          console.log('No valid session found:', error || sessionData?.error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        console.log('Session restored from HttpOnly cookies:', sessionData);
        
        // Set the session in Supabase client for API calls
        if (sessionData.session) {
          await supabase.auth.setSession({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token
          });
          
          setUser(sessionData.user);
          setSession(sessionData.session);
          setProfile(sessionData.profile);
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Also set up Supabase auth state listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          setSession(session);
          
          // Fetch profile
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (mounted) {
              setProfile(profile);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
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
      // Call our secure logout endpoint to clear HttpOnly cookies
      await supabase.functions.invoke('auth-logout');
      
      // Also sign out from Supabase client
      await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even if logout fails
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}