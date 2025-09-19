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

    // For now, just return success without creating users to test basic function
    console.log('🎯 Returning test success response');
    return new Response(
      JSON.stringify({ 
        message: "Test success",
        email: email,
        role: demoAccount.role,
        name: demoAccount.name
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

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