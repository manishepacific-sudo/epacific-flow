import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  role: "manager" | "user";
  full_name: string;
  mobile_number?: string;
  station_id?: string;
  center_address?: string;
  admin_email?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 User-invite function started");
    const { email, role, full_name, mobile_number, station_id, center_address, admin_email }: InviteUserRequest = await req.json();
    console.log(`📧 Inviting user: ${email} with role: ${role} by admin: ${admin_email}`);

    if (!email || !role || !full_name) {
      console.error("❌ Missing required fields:", { email: !!email, role: !!role, full_name: !!full_name });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email, role, and full name are required" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate admin permissions
    if (admin_email) {
      console.log("🔐 Validating admin permissions...");
      
      // Check demo credentials first
      const demoCredentials = {
        'admin@epacific.com': 'admin',
        'manager@epacific.com': 'manager'
      };
      
      let adminRole = null;
      
      if (demoCredentials[admin_email]) {
        adminRole = demoCredentials[admin_email];
        console.log(`✅ Demo admin detected: ${admin_email} with role: ${adminRole}`);
      } else {
        // Check database for admin profile
        const { data: adminProfile, error: adminError } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('email', admin_email)
          .single();
          
        if (adminError || !adminProfile) {
          console.error("❌ Admin profile not found:", adminError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Unauthorized: Admin profile not found" 
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        
        adminRole = adminProfile.role;
        console.log(`✅ Database admin found: ${admin_email} with role: ${adminRole}`);
      }
      
      if (!['admin', 'manager'].includes(adminRole)) {
        console.error("❌ Insufficient permissions:", adminRole);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Unauthorized: Insufficient permissions to invite users" 
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      // Enhanced role restrictions: managers can create other managers now
      if (adminRole === 'manager' && !['manager', 'user'].includes(role)) {
        console.error("❌ Manager cannot create admin accounts");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Managers cannot create admin accounts" 
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Check if user already exists
    console.log("🔍 Checking for existing user...");
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers.users.find(u => u.email === email);
    console.log(`👤 User exists: ${!!userExists}`);

    if (userExists) {
      console.log("🔄 Processing existing user...");
      
      // Check if profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        console.log(`📋 Existing profile found - is_demo: ${existingProfile.is_demo}, password_set: ${existingProfile.password_set}`);
        
        // If user already has password set and is not a demo user, return conflict
        if (existingProfile.password_set && !existingProfile.is_demo) {
          console.error("❌ User already exists with password set");
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "User with this email already exists and has an active account. Please use a different email address.",
              userExists: true
            }),
            {
              status: 409,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }

        // Clean up expired invitations or demo users before creating new invitation
        try {
          console.log(`🗑️ Cleaning up existing user for: ${email}`);
          await supabaseAdmin.from("profiles").delete().eq("user_id", userExists.id);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
          console.log(`✅ Cleaned up existing user: ${email}`);
        } catch (deleteError) {
          console.error("❌ Error cleaning up existing user:", deleteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to clean up existing user. Please try again." 
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      } else {
        // User exists in auth but no profile - clean up auth user
        try {
          console.log(`🗑️ Cleaning up auth user without profile: ${email}`);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
          console.log(`✅ Cleaned up auth user without profile: ${email}`);
        } catch (deleteError) {
          console.error("❌ Error cleaning up auth user:", deleteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to clean up existing auth user. Please try again." 
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
      }
    }

    // Generate invitation token with 2-hour expiry
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    console.log(`⏰ Invitation expires at: ${expiresAt.toISOString()}`);

    // Construct invitation URL - redirect to handle-invite to process Supabase tokens
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '';
    const inviteUrl = `${baseUrl}/handle-invite`;
    
    console.log(`🔗 Invite URL: ${inviteUrl}`);
    console.log(`📧 Attempting to send invitation via Supabase to: ${email}`);

    // Use ONLY inviteUserByEmail - this handles both user creation and email sending
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
      data: {
        full_name,
        role,
        mobile_number: mobile_number || "",
        station_id: station_id || "",
        center_address: center_address || "",
        invite_expires_at: expiresAt.toISOString()
      }
    });

    if (inviteError) {
      console.error("❌ Supabase invitation failed:", inviteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send invitation: ${inviteError.message}` 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Invitation sent successfully via Supabase");
    console.log("📊 Invite data:", inviteData);

    // Get the created user to obtain user ID for response
    const { data: newUsers } = await supabaseAdmin.auth.admin.listUsers();
    const newUser = newUsers.users.find(u => u.email === email);
    
    if (!newUser) {
      console.error("❌ Could not find newly created user");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "User invitation sent but could not retrieve user details" 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Profile will be automatically created by database trigger
    // Update the profile with the invitation data since trigger only sets basic fields
    console.log(`👤 Updating profile for user: ${newUser.id}`);
    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      full_name,
      role,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      is_demo: false,
      password_set: false,
    }).eq('user_id', newUser.id);

    if (profileError) {
      console.error("❌ Error updating profile:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update user profile: ${profileError.message}` 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ User profile updated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.id,
          email,
          full_name,
          role,
          expires_at: expiresAt.toISOString(),
        },
        message: "User invited successfully. Check email for setup instructions.",
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (err: any) {
    console.error("❌ Error in user-invite function:", err);
    console.error("❌ Error message:", err.message);
    console.error("❌ Error stack:", err.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || "An unexpected error occurred" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});