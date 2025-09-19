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
  console.log('🚀 Auth-login handler started');
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Reading request body...');
    const requestBody = await req.text();
    console.log('📄 Raw request body:', requestBody);
    
    let email, password;
    try {
      const parsed = JSON.parse(requestBody);
      email = parsed.email;
      password = parsed.password;
      console.log('✅ Parsed credentials for:', email);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    console.log('🔍 Validating demo credentials...');
    // Validate demo credentials
    const demoCredentials = {
      'john.doe@epacific.com': { password: 'password123', role: 'user', name: 'John Doe' },
      'jane.manager@epacific.com': { password: 'password123', role: 'manager', name: 'Jane Manager' },
      'admin@epacific.com': { password: 'Admin@123', role: 'admin', name: 'System Administrator' }
    };

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

    try {
      // First, try to sign in with existing credentials
      console.log('🔑 Step 1: Attempting sign in...');
      
      const signInResult = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      console.log('📊 Sign in result - error:', signInResult.error?.message);
      console.log('📊 Sign in result - user exists:', !!signInResult.data?.user);

      if (signInResult.data?.user && !signInResult.error) {
        console.log('✅ Sign in successful, getting profile...');
        
        // Get the profile (should exist due to trigger)
        const profileResult = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', signInResult.data.user.id)
          .maybeSingle();

        console.log('📊 Profile result - error:', profileResult.error?.message);
        console.log('📊 Profile result - role:', profileResult.data?.role);

        // Return successful authentication
        return new Response(
          JSON.stringify({
            message: "Authentication successful",
            user: signInResult.data.user,
            session: signInResult.data.session,
            profile: profileResult.data || {
              full_name: demoAccount.name,
              role: demoAccount.role,
              email: email
            }
          }),
          { 
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // If sign in failed, create new user (trigger will create profile automatically)
      console.log('🔐 Step 2: Creating new user...');
      const createResult = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: demoAccount.name,
          role: demoAccount.role,
          mobile_number: '1234567890',
          station_id: 'DEMO001',
          center_address: 'Demo Center Address'
        }
      });

      console.log('📊 User creation - error:', createResult.error?.message);
      console.log('📊 User creation - user exists:', !!createResult.data?.user);

      if (createResult.error) {
        console.error('❌ User creation failed:', createResult.error);
        return new Response(
          JSON.stringify({ error: 'User creation failed: ' + createResult.error.message }),
          { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      // Wait a moment for the trigger to create the profile
      console.log('⏳ Waiting for profile creation trigger...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the profile with the correct role (trigger creates basic profile)
      console.log('👤 Step 3: Updating profile with correct role...');
      const updateResult = await supabaseAdmin
        .from('profiles')
        .update({ role: demoAccount.role })
        .eq('user_id', createResult.data.user.id)
        .select()
        .maybeSingle();

      console.log('📊 Profile update - error:', updateResult.error?.message);

      // Now sign in the newly created user
      console.log('🔑 Step 4: Signing in new user...');
      const newSignInResult = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      console.log('📊 New sign in - error:', newSignInResult.error?.message);

      if (newSignInResult.error) {
        console.error('❌ New user sign in failed:', newSignInResult.error);
        return new Response(
          JSON.stringify({ error: 'New user sign in failed: ' + newSignInResult.error.message }),
          { 
            status: 401, 
            headers: { "Content-Type": "application/json", ...corsHeaders }
          }
        );
      }

      console.log('✅ Step 5: Authentication successful for new user');
      return new Response(
        JSON.stringify({
          message: "Authentication successful",
          user: newSignInResult.data.user,
          session: newSignInResult.data.session,
          profile: updateResult.data || {
            full_name: demoAccount.name,
            role: demoAccount.role,
            email: email
          }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );

    } catch (authError: any) {
      console.error('❌ Catch block error:', authError);
      console.error('❌ Error details:', {
        name: authError.name,
        message: authError.message,
        stack: authError.stack
      });
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed',
          details: authError.message,
          name: authError.name
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

  } catch (error: any) {
    console.error("💥 Critical error in auth-login function:", error);
    console.error("📊 Error name:", error.name);
    console.error("📋 Error message:", error.message);
    console.error("📚 Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Login failed",
        details: error.message,
        type: error.name || "UnknownError",
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);