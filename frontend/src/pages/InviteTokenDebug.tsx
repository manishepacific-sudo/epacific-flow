import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export default function InviteTokenDebug() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    const info = {
      fullUrl: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      tokenFromSearchParams: searchParams.get('token'),
      tokenFromWindow: new URLSearchParams(window.location.search).get('token'),
      allSearchParams: Object.fromEntries(searchParams.entries()),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    
    setDebugInfo(info);
    console.log('Debug Info:', info);
  }, [searchParams]);

  const handleValidateToken = async () => {
    const token = searchParams.get('token') || new URLSearchParams(window.location.search).get('token');
    
    if (!token) {
      setValidationResult({ error: 'No token found in URL' });
      return;
    }

    console.log('🔍 Validating token:', token);
    try {
      // First try direct database query
      const { data: tokenData, error: dbError } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .eq('used', false)
        .maybeSingle();
      
      console.log('📊 Direct DB query result:', { tokenData, dbError });
      
      // Then try the edge function
      const { data, error } = await supabase.functions.invoke('set-password-with-token', {
        body: {
          token,
          validate_only: true,
        },
      });

      console.log('Validation response:', { data, error });
      setValidationResult({ 
        data, 
        error, 
        directDbQuery: { tokenData, dbError },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Validation error:', err);
      setValidationResult({ error: err.message });
    }
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Invitation Token Debug Page</h1>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">URL Information</h2>
          <pre className="bg-muted p-4 rounded text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Token Validation</h2>
          <Button onClick={handleValidateToken} className="mb-4">
            Validate Token
          </Button>
          
          {validationResult && (
            <pre className="bg-muted p-4 rounded text-xs overflow-auto">
              {JSON.stringify(validationResult, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Supabase Session</h2>
          <Button 
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              console.log('Current session:', session);
              alert('Session: ' + (session ? 'Exists' : 'None'));
            }} 
            className="mb-4"
          >
            Check Session
          </Button>
        </div>

        <div className="space-x-4">
          <Button onClick={() => navigate('/set-password' + window.location.search)}>
            Go to Set Password Page
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
