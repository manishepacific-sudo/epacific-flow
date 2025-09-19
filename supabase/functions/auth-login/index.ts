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

    // Create demo users if they don't exist
    const demoAccounts = [
      {
        email: 'john.doe@epacific.com',
        password: 'password123',
        full_name: 'John Doe',
        mobile_number: '+91 9876543210',
        station_id: 'STN001',
        center_address: 'Delhi Office, Main Street 123',
        role: 'user'
      },
      {
        email: 'jane.manager@epacific.com',
        password: 'password123',
        full_name: 'Jane Manager',
        mobile_number: '+91 9876543211',
        station_id: 'STN002',
        center_address: 'Mumbai Office, Business District 456',
        role: 'manager'
      },
      {
        email: 'admin@epacific.com',
        password: 'password123',
        full_name: 'Admin User',
        mobile_number: '+91 9876543212',
        station_id: 'STN003',
        center_address: 'Bangalore Office, Tech Park 789',
        role: 'admin'
      }
    ];

    const demoAccount = demoAccounts.find(account => account.email === email);
    
    if (!demoAccount || demoAccount.password !== password) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user exists and authenticate
    let authUser;
    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      authUser = existingUser?.user;
      
      if (authUser) {
        console.log('User exists, attempting authentication');
        
        // Try to sign in with password
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          console.error('Sign in error:', signInError);
          return new Response(
            JSON.stringify({ error: "Invalid credentials" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        
        authUser = signInData.user;
        console.log('Authentication successful for existing user');
        
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        const response = new Response(
          JSON.stringify({ 
            user: authUser,
            profile: profile,
            session: signInData.session
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );

        // Set HttpOnly cookies for session management
        if (signInData.session?.access_token && signInData.session?.refresh_token) {
          response.headers.set('Set-Cookie', [
            `sb-access-token=${signInData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`,
            `sb-refresh-token=${signInData.session.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
          ].join(', '));
        }

        return response;
      }
    } catch (error) {
      console.log('User not found, will create new user');
    }

    // Create user if doesn't exist
    if (!authUser) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoAccount.email,
        password: demoAccount.password,
        email_confirm: true,
        user_metadata: {
          full_name: demoAccount.full_name,
          mobile_number: demoAccount.mobile_number,
          station_id: demoAccount.station_id,
          center_address: demoAccount.center_address,
          role: demoAccount.role
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      authUser = newUser.user;
      console.log('New user created successfully');
    }

    // For new users, we need to sign them in to get a proper session
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error('Sign in error for new user:', signInError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate new user" }),
        {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .single();

    const response = new Response(
      JSON.stringify({ 
        user: authUser,
        profile: profile,
        session: signInData.session
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

    // Set HttpOnly cookies for session management
    if (signInData.session?.access_token && signInData.session?.refresh_token) {
      response.headers.set('Set-Cookie', [
        `sb-access-token=${signInData.session.access_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/`,
        `sb-refresh-token=${signInData.session.refresh_token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
      ].join(', '));
    }

    return response;

  } catch (error: any) {
    console.error("Error in auth-login function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);