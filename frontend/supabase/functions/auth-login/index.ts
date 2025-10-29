import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
};

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Auth-login handler started');
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Reading request body...');
    const { email, password } = await req.json();
    console.log('✅ Parsed credentials for:', email);

    // Initialize Supabase client for real authentication
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Demo credentials validation (fallback for demo accounts)
    const demoCredentials = {
      'admin@demo.local': { password: 'Admin@123', role: 'admin', name: 'Demo Administrator' },
      'john.doe@epacific.com': { password: 'password123', role: 'user', name: 'John Doe' },
      'jane.manager@epacific.com': { password: 'password123', role: 'manager', name: 'Jane Manager' },
      'admin@epacific.com': { password: 'Admin@123', role: 'admin', name: 'System Administrator' },
      'Manish.epacific@gmail.com': { password: 'password123', role: 'user', name: 'Manish Kumar' },
      'manish.payteq@gmail.com': { password: 'password123', role: 'manager', name: 'Manish' }
    };

    // First try real Supabase authentication
    try {
      console.log('🔐 Attempting real Supabase auth for:', email);
      
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (!authError && authData.user) {
        console.log('✅ Real auth successful for:', email);
        
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();

        if (profile) {
          console.log('🎯 Returning real auth success response');
          return new Response(
            JSON.stringify({
              message: "Login successful",
              user: {
                id: authData.user.id,
                email: authData.user.email,
                email_confirmed_at: authData.user.email_confirmed_at,
                created_at: authData.user.created_at
              },
              profile: profile,
              session: authData.session
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }
      
      console.log('🔄 Real auth failed, trying demo credentials...');
    } catch (realAuthError) {
      console.log('🔄 Real auth error, trying demo credentials:', realAuthError);
    }

    // Fallback to demo credentials
    const demoAccount = demoCredentials[email as keyof typeof demoCredentials];
    
    if (!demoAccount || demoAccount.password !== password) {
      console.log('❌ Invalid credentials for:', email);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ Demo credentials valid for:', email, 'role:', demoAccount.role);

    // Return demo success response
    console.log('🎯 Returning demo success response');
    return new Response(
      JSON.stringify({ 
        message: "Demo login successful",
        email: email,
        role: demoAccount.role,
        name: demoAccount.name,
        demo: true
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("💥 Error in auth-login function:", error);
    
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