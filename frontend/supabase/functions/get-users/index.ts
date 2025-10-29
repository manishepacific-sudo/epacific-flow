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
    
    console.log('👤 User requesting users:', admin_email);

    // Validate that the requesting user has appropriate role
    if (!admin_email) {
      console.log('❌ No email provided');
      return new Response(
        JSON.stringify({ error: "Unauthorized: Email required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // First get the user_id from profiles
    console.log('🔍 Querying profiles for email:', admin_email);
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', admin_email)
      .maybeSingle();

    console.log('📊 Profile query result:', { userProfile, profileError });

    if (profileError) {
      console.log('❌ Profile query error:', profileError);
      return new Response(
        JSON.stringify({ error: "Database error", details: profileError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!userProfile) {
      console.log('❌ User not found:', admin_email);
      // Let's try querying all profiles to debug
      const { data: allProfiles } = await supabaseAdmin
        .from('profiles')
        .select('email, user_id')
        .limit(5);
      console.log('🔍 Sample profiles in database:', allProfiles);
      
      return new Response(
        JSON.stringify({ error: "Unauthorized: User not found" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Now get the role from user_roles table
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userProfile.user_id)
      .maybeSingle();

    if (roleError) {
      console.log('❌ Role query error:', roleError);
      return new Response(
        JSON.stringify({ error: "Database error", details: roleError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!roleData) {
      console.log('❌ No role assigned to user:', admin_email);
      return new Response(
        JSON.stringify({ error: "Unauthorized: No role assigned" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Only managers and admins can view users
    if (!['admin', 'manager'].includes(roleData.role)) {
      console.log('❌ Unauthorized user list request - role:', roleData.role);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins and managers can view users" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ User authorized with role:', roleData.role);

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