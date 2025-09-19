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
  console.log('🚀 Get-users handler started');
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Reading request body...');
    const { admin_email } = await req.json();
    
    console.log('👤 Admin requesting users:', admin_email);

    // Basic validation for demo mode
    if (!admin_email || !admin_email.includes('admin')) {
      console.log('❌ Unauthorized user list request');
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins can view users" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch all users using service role (bypasses RLS)
    console.log('👥 Fetching all users...');
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Users fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users: " + fetchError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ Users fetched successfully:', users.length);

    return new Response(
      JSON.stringify({ 
        message: "Users fetched successfully",
        users: users
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("💥 Error in get-users function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch users",
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