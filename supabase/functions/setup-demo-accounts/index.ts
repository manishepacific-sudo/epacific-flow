import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create a Supabase client with service role key for admin operations
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
    console.log("Starting demo account creation...");

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

    const results = [];

    for (const account of demoAccounts) {
      console.log(`Creating account for ${account.email}...`);
      
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(account.email);
      
      if (existingUser?.user) {
        console.log(`User ${account.email} already exists, skipping creation`);
        results.push({ email: account.email, status: 'already_exists' });
        continue;
      }

      // Create the auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Skip email confirmation for demo accounts
        user_metadata: {
          full_name: account.full_name,
          mobile_number: account.mobile_number,
          station_id: account.station_id,
          center_address: account.center_address,
          role: account.role
        }
      });

      if (authError) {
        console.error(`Error creating auth user for ${account.email}:`, authError);
        results.push({ email: account.email, status: 'error', error: authError.message });
        continue;
      }

      console.log(`Auth user created for ${account.email}, ID: ${authData.user.id}`);

      // The profile should be created automatically by the trigger
      // Let's verify it was created
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for ${account.email}:`, profileError);
        results.push({ 
          email: account.email, 
          status: 'auth_created_profile_error', 
          user_id: authData.user.id,
          error: profileError.message 
        });
      } else {
        console.log(`Profile created successfully for ${account.email}`);
        results.push({ 
          email: account.email, 
          status: 'success', 
          user_id: authData.user.id,
          profile_id: profile.id
        });
      }
    }

    console.log("Demo account creation completed:", results);

    return new Response(JSON.stringify({ 
      message: "Demo accounts processed",
      results 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in setup-demo-accounts function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);