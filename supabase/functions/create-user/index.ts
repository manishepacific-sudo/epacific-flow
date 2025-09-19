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

// Admin client with service role for bypassing RLS
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Create-user handler started');
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Reading request body...');
    const { 
      full_name, 
      email, 
      mobile_number, 
      station_id, 
      center_address, 
      role,
      admin_email 
    } = await req.json();
    
    console.log('✅ Parsed user data for:', email);
    console.log('👤 Admin creating user:', admin_email);

    // Validate that the requesting user is an admin (basic validation for demo)
    if (!admin_email || !admin_email.includes('admin')) {
      console.log('❌ Unauthorized user creation attempt');
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins can create users" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create user in profiles table using service role (bypasses RLS)
    console.log('👤 Creating user profile...');
    const { data: userData, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        user_id: crypto.randomUUID(),
        full_name: full_name,
        email: email,
        mobile_number: mobile_number,
        station_id: station_id,
        center_address: center_address,
        role: role
      }])
      .select()
      .single();

    if (createError) {
      console.error('❌ Profile creation error:', createError);
      return new Response(
        JSON.stringify({ error: "Failed to create user profile: " + createError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ User created successfully:', userData.id);

    return new Response(
      JSON.stringify({ 
        message: "User created successfully",
        user: userData
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("💥 Error in create-user function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "User creation failed",
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