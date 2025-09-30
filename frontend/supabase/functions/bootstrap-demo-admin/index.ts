import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Bootstrap demo admin function called");

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create demo admin user
    const demoAdminEmail = 'admin@demo.local';
    const demoAdminPassword = 'Admin@123';

    console.log("Creating demo admin user...");

    // Check if demo admin already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error checking existing users:", listError);
      throw listError;
    }

    const existingDemoAdmin = existingUsers.users.find(user => user.email === demoAdminEmail);
    
    if (existingDemoAdmin) {
      console.log("Demo admin already exists");
      return new Response(JSON.stringify({ 
        message: "Demo admin already exists",
        email: demoAdminEmail,
        status: "exists"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Create the demo admin user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: demoAdminEmail,
      password: demoAdminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Administrator',
        role: 'admin',
        is_demo: true
      }
    });

    if (createError) {
      console.error("Error creating demo admin:", createError);
      throw createError;
    }

    console.log("Demo admin user created:", authUser.user?.id);

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: authUser.user!.id,
        email: demoAdminEmail,
        full_name: 'Demo Administrator',
        role: 'admin',
        is_demo: true,
        password_set: true,
        mobile_number: '+1-555-0100',
        station_id: 'DEMO-ADMIN',
        center_address: 'Demo Admin Center'
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      throw profileError;
    }

    console.log("Demo admin bootstrap completed successfully");

    return new Response(JSON.stringify({ 
      message: "Demo admin bootstrapped successfully",
      email: demoAdminEmail,
      password: demoAdminPassword,
      userId: authUser.user!.id,
      status: "created"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in bootstrap-demo-admin function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to bootstrap demo admin account"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);