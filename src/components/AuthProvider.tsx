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

  const setDemoUser = async (email: string, role: string, name: string) => {
    console.log('🎭 Setting demo user:', { email, role, name });
    
    try {
      // Create a mock user and session for demo purposes (no Supabase Auth needed)
      const mockUserId = `demo-${email.replace('@', '-').replace('.', '-')}`;
      
      const mockUser = {
        id: mockUserId,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: name,
          role: role,
          demo: true
        },
        app_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      } as any;

      const mockSession = {
        access_token: 'demo-token',
        refresh_token: 'demo-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: mockUser
      } as any;

      const mockProfile = {
        id: mockUserId,
        user_id: mockUserId,
        email: email,
        full_name: name,
        role: role,
        mobile_number: '1234567890',
        station_id: 'DEMO001',
        center_address: 'Demo Center Address',
        is_demo: true,
        password_set: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Set the demo user state directly
      setUser(mockUser);
      setSession(mockSession);
      setProfile(mockProfile);
      setLoading(false);
      
      console.log('✅ Demo user set successfully:', { email, role, name });
      
    } catch (error) {
      console.error('Error setting demo user:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.log('Session error:', error);
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('Session found, setting user data');
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
              console.log('Profile found:', profile);
              setProfile(profile);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        } else {
          console.log('No session found');
          setUser(null);
          setSession(null);
          setProfile(null);
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

    // Set up Supabase auth state listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.email);
        
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
                console.log('Profile fetched in auth change:', profile);
                setProfile(profile);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
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
      console.error('Error signing out:', error);
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