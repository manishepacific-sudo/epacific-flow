import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DiagnosticPage() {
  const { user, profile, loading } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [profileError, setProfileError] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<any>(null);
  const [allProfilesError, setAllProfilesError] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          // Try to fetch all columns
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            setProfileError(error);
          } else {
            setProfileData(data);
          }
        } catch (err) {
          setProfileError(err);
        }
      }
    };

    const fetchAllProfiles = async () => {
      try {
        // Get first profile to see structure
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        
        if (error) {
          setAllProfilesError(error);
        } else {
          setAllProfiles(data);
        }
      } catch (err) {
        setAllProfilesError(err);
      }
    };

    fetchProfile();
    fetchAllProfiles();
  }, [user]);

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Diagnostic</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Auth Loading State</h2>
            <pre className="text-sm overflow-auto">{JSON.stringify({ loading }, null, 2)}</pre>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">User Object (from AuthProvider)</h2>
            <pre className="text-sm overflow-auto">{JSON.stringify(user, null, 2)}</pre>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Profile Object (from AuthProvider)</h2>
            <pre className="text-sm overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Direct Profile Query (from this page)</h2>
            {profileData && (
              <div>
                <p className="text-green-600 font-semibold mb-2">✓ Profile Found</p>
                <pre className="text-sm overflow-auto">{JSON.stringify(profileData, null, 2)}</pre>
              </div>
            )}
            {profileError && (
              <div>
                <p className="text-red-600 font-semibold mb-2">✗ Profile Error</p>
                <pre className="text-sm overflow-auto">{JSON.stringify(profileError, null, 2)}</pre>
              </div>
            )}
            {!profileData && !profileError && user && (
              <p className="text-muted-foreground">Loading...</p>
            )}
            {!user && (
              <p className="text-muted-foreground">No user authenticated</p>
            )}
          </div>

          <div className="p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Database Schema Check (sample profile)</h2>
            {allProfiles && (
              <div>
                <p className="text-green-600 font-semibold mb-2">✓ Sample Profile Retrieved</p>
                <p className="text-sm text-muted-foreground mb-2">Available columns:</p>
                {allProfiles[0] && (
                  <ul className="list-disc list-inside mb-2">
                    {Object.keys(allProfiles[0]).map(key => (
                      <li key={key} className="text-sm">{key}</li>
                    ))}
                  </ul>
                )}
                <pre className="text-sm overflow-auto">{JSON.stringify(allProfiles, null, 2)}</pre>
              </div>
            )}
            {allProfilesError && (
              <div>
                <p className="text-red-600 font-semibold mb-2">✗ Schema Check Error</p>
                <pre className="text-sm overflow-auto">{JSON.stringify(allProfilesError, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }} variant="destructive">
              Sign Out
            </Button>
            <Button onClick={() => navigate('/dashboard/user')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </div>

        <div className="p-4 border rounded-lg bg-muted">
          <h2 className="text-xl font-semibold mb-2">Console Logs</h2>
          <p className="text-sm text-muted-foreground">
            Check your browser console (F12) for detailed logs about profile loading.
          </p>
        </div>
      </div>
    </div>
  );
}

