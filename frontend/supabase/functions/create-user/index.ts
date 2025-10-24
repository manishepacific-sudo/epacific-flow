import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  mobile_number: z.string().trim().max(20, 'Mobile number must be less than 20 characters').optional(),
  station_id: z.string().trim().max(50, 'Station ID must be less than 50 characters').optional(),
  center_address: z.string().trim().max(500, 'Center address must be less than 500 characters').optional(),
  role: z.enum(['admin', 'manager', 'user'], { 
    errorMap: () => ({ message: 'Role must be one of: admin, manager, user' })
  })
});

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Create-user handler started');
  
  if (req.method === "OPTIONS") {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.log('❌ Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('✅ Authenticated user:', user.id);

    // Parse and validate request body
    console.log('📥 Reading request body...');
    const requestBody = await req.json();
    
    // Validate input using Zod schema
    const validationResult = createUserSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { 
      full_name, 
      email, 
      mobile_number, 
      station_id, 
      center_address, 
      role
    } = validationResult.data;
    
    console.log('✅ Validated user data for:', email);

    // Get requesting user's role from user_roles table
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { user_id_param: user.id });

    if (roleError || !adminRole) {
      console.log('❌ Failed to get user role:', roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Could not verify user role" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('👤 Admin role:', adminRole);

    // Verify admin permissions - admins can create any role, managers can create users and managers
    if (adminRole === 'admin') {
      console.log('✅ Admin user authorized to create any role');
    } else if (adminRole === 'manager' && ['user', 'manager'].includes(role)) {
      console.log('✅ Manager user authorized to create user or manager role');
    } else {
      console.log('❌ Unauthorized user creation - insufficient permissions');
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Insufficient permissions to create this user role",
          details: `Your role (${adminRole}) cannot create users with role: ${role}`
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create user in profiles table using service role (bypasses RLS)
    console.log('👤 Creating Supabase auth user first...');
    
    // First create the auth user
    let { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
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
      errorCode: authCreateError?.status,
      errorMessage: authCreateError?.message 
    });

    if (authCreateError) {
      console.error('❌ Auth user creation error:', JSON.stringify(authCreateError, null, 2));
      
      // Handle specific auth errors
      if (authCreateError.message?.includes('already registered') || authCreateError.status === 422) {
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
          JSON.stringify({ error: "Failed to create auth user: " + authCreateError.message }),
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

    // Update the profile with the correct role and details (trigger creates basic profile)
    console.log('👤 Updating profile with full details...');
    let userData;
    const { data: profileData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name,
        mobile_number: mobile_number,
        station_id: station_id,
        center_address: center_address,
        role: role
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
          center_address: center_address,
          role: role
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
