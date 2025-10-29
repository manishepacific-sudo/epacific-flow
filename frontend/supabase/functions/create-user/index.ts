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
    console.log('👤 User creating user:', admin_email);

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

    // Check user role from database
    // First get the user_id from profiles
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', admin_email)
      .single();

    if (profileError || !userProfile) {
      console.log('❌ User not found:', admin_email);
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
      .single();

    if (roleError || !roleData) {
      console.log('❌ User role not found:', roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: User role not found" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate role permissions
    const requestingUserRole = roleData.role;
    if (requestingUserRole === 'admin') {
      // Admins can create any role
      console.log('✅ Admin creating user with role:', role);
    } else if (requestingUserRole === 'manager') {
      // Managers can only create users and managers
      if (!['user', 'manager'].includes(role)) {
        console.log('❌ Manager cannot create admin role');
        return new Response(
          JSON.stringify({ error: "Unauthorized: Managers can only create users and managers" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      console.log('✅ Manager creating user with role:', role);
    } else {
      console.log('❌ Unauthorized user creation attempt - role:', requestingUserRole);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins and managers can create users" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create user in profiles table using service role (bypasses RLS)
    console.log('👤 Creating Supabase auth user first...');
    
    // First create the auth user
    let { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
        role: role,
        mobile_number: mobile_number,
        station_id: station_id,
        center_address: center_address
      }
    });

    console.log('📊 Auth creation result:', { 
      success: !!authUser?.user, 
      userId: authUser?.user?.id,
      errorCode: authError?.status,
      errorMessage: authError?.message 
    });

    if (authError) {
      console.error('❌ Auth user creation error:', JSON.stringify(authError, null, 2));
      
      // Handle specific auth errors
      if (authError.message?.includes('already registered') || authError.status === 422) {
        console.log('🔄 User already exists, trying to get existing user...');
        
        // Try to get existing user by email
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
          console.log('✅ Found existing user:', existingUser.id);
          // Use existing user data
          authUser = { user: existingUser };
        } else {
          console.error('❌ User should exist but not found');
          return new Response(
            JSON.stringify({ error: "User creation failed: User exists but cannot be retrieved" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to create auth user: " + authError.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    if (!authUser?.user) {
      console.error('❌ No auth user data after creation/retrieval');
      return new Response(
        JSON.stringify({ error: "Failed to get user data" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Wait a moment for the trigger to create the profile
    console.log('⏳ Waiting for profile creation trigger...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update the profile with the details (trigger creates basic profile)
    console.log('👤 Updating profile with full details...');
    let userData;
    const { data: profileData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name,
        mobile_number: mobile_number,
        station_id: station_id,
        center_address: center_address
      })
      .eq('user_id', authUser.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      // Try to create the profile if update fails (trigger might not have worked)
      console.log('🔄 Trigger may have failed, creating profile manually...');
      const { data: manualProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          user_id: authUser.user.id,
          full_name: full_name,
          email: email,
          mobile_number: mobile_number,
          station_id: station_id,
          center_address: center_address
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Manual profile creation error:', insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create user profile: " + insertError.message }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      userData = manualProfile;
    } else {
      userData = profileData;
    }

    // Create role entry in user_roles table
    console.log('🔐 Creating user role...');
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: role
      });

    if (roleInsertError) {
      console.error('❌ Failed to create user role:', roleInsertError);
      // Clean up created user and profile
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('profiles').delete().eq('user_id', authUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to create user role: " + roleInsertError.message }),
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