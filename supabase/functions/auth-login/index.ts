import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Use anon client for regular auth operations
const supabase = createClient(supabaseUrl, anonKey);

// Admin client for user management
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password } = await req.json();
    console.log('Login attempt for:', email);

    // Validate demo credentials
    const demoCredentials = {
      'john.doe@epacific.com': { password: 'password123', role: 'user', name: 'John Doe' },
      'jane.manager@epacific.com': { password: 'password123', role: 'manager', name: 'Jane Manager' },
      'admin@epacific.com': { password: 'password123', role: 'admin', name: 'Admin User' }
    };

    const demoAccount = demoCredentials[email as keyof typeof demoCredentials];
    
    if (!demoAccount || demoAccount.password !== password) {
      console.log('Invalid credentials for:', email);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Demo credentials valid, checking/creating user');

    // Try to sign in first
    let authData;
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInData?.user && !signInError) {
        console.log('User signed in successfully');
        authData = signInData;
      } else {
        console.log('Sign in failed, will try to create user:', signInError?.message);
      }
    } catch (error) {
      console.log('Sign in attempt failed:', error);
    }

    // If sign in failed, try to create user
    if (!authData) {
      try {
        console.log('Creating new user...');
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: demoAccount.name,
            role: demoAccount.role
          }
        });

        if (createError) {
          if (createError.message.includes('already been registered')) {
            console.log('User already exists, this is expected');
            // Try signing in again
            const { data: signInData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (retryError) {
              console.error('Retry sign in failed:', retryError);
              return new Response(
                JSON.stringify({ error: "Authentication failed" }),
                {
                  status: 401,
                  headers: { "Content-Type": "application/json", ...corsHeaders },
                }
              );
            }
            
            authData = signInData;
          } else {
            console.error('User creation error:', createError);
            return new Response(
              JSON.stringify({ error: "Failed to create account" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
        } else {
          // New user created, now sign them in
          console.log('New user created, signing in...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (signInError) {
            console.error('Sign in after creation failed:', signInError);
            return new Response(
              JSON.stringify({ error: "Authentication failed" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
          
          authData = signInData;
        }
      } catch (error) {
        console.error('User creation catch error:', error);
        return new Response(
          JSON.stringify({ error: "Account setup failed" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    if (!authData?.user || !authData?.session) {
      console.error('No auth data after all attempts');
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('Authentication successful, fetching profile...');

    // Get or create user profile
    let profile;
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (existingProfile) {
        profile = existingProfile;
        console.log('Found existing profile');
      } else {
        console.log('Creating new profile...');
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert([{
            user_id: authData.user.id,
            full_name: demoAccount.name,
            email: email,
            mobile_number: '+91 9876543210',
            station_id: 'STN001',
            center_address: 'Demo Office',
            role: demoAccount.role
          }])
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue without profile for now
          profile = {
            user_id: authData.user.id,
            full_name: demoAccount.name,
            email: email,
            role: demoAccount.role
          };
        } else {
          profile = newProfile;
        }
      }
    } catch (error) {
      console.error('Profile fetch/create error:', error);
      profile = {
        user_id: authData.user.id,
        full_name: demoAccount.name,
        email: email,
        role: demoAccount.role
      };
    }

    console.log('Returning successful response');

    const response = new Response(
      JSON.stringify({ 
        user: authData.user,
        profile: profile,
        session: authData.session
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

    // Set HttpOnly cookies for session management
    if (authData.session?.access_token && authData.session?.refresh_token) {
      response.headers.set('Set-Cookie', [
        `sb-access-token=${authData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`,
        `sb-refresh-token=${authData.session.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
      ].join(', '));
    }

    return response;

  } catch (error: any) {
    console.error("Error in auth-login function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Login failed",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);