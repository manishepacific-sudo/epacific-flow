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
  registrar?: string;
  admin_email?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 User-invite function started");
    const { email, role, full_name, mobile_number, station_id, center_address, registrar, admin_email }: InviteUserRequest = await req.json();
    console.log(`📧 Inviting user: ${email} with role: ${role} by admin: ${admin_email}`);

    if (!email || !role || !full_name) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email, role, and full name are required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ Validate admin permissions
    if (admin_email) {
      console.log("🔐 Validating admin permissions...");
      const demoCredentials: Record<string, string> = {
        'admin@epacific.com': 'admin',
        'manager@epacific.com': 'manager'
      };

      let adminRole = null;

      if (demoCredentials[admin_email as keyof typeof demoCredentials]) {
        adminRole = demoCredentials[admin_email as keyof typeof demoCredentials];
        console.log(`✅ Demo admin detected: ${admin_email} with role: ${adminRole}`);
      } else {
        const { data: adminProfile, error: adminError } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('email', admin_email)
          .single();

        if (adminError || !adminProfile) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: Admin profile not found" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        adminRole = adminProfile.role;
        console.log(`✅ Database admin found: ${admin_email} with role: ${adminRole}`);
      }

      if (!['admin', 'manager'].includes(adminRole)) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Insufficient permissions" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (adminRole === 'manager' && !['manager', 'user'].includes(role)) {
        return new Response(
          JSON.stringify({ success: false, error: "Managers cannot create admin accounts" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ✅ Check if user already exists
    console.log("🔍 Checking for existing user...");
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers.users.find(u => u.email === email);

    if (userExists) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        if (existingProfile.password_set && !existingProfile.is_demo) {
          return new Response(
            JSON.stringify({ success: false, error: "User already exists with password set", userExists: true }),
            { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      // Clean up all existing data for this user/email
      console.log("🧹 Cleaning up existing user data...");
      
      // Delete profile by user_id (more reliable)
      await supabaseAdmin.from("profiles").delete().eq("user_id", userExists.id);
      
      // Delete any profiles by email as backup
      await supabaseAdmin.from("profiles").delete().eq("email", email);
      
      // Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(userExists.id);
      
      // Clean up invite tokens
      await supabaseAdmin.from("invite_tokens").delete().eq("email", email);
      
      console.log("✅ Cleanup completed");
    }

    // Also clean up any orphaned profiles with this email
    await supabaseAdmin.from("profiles").delete().eq("email", email);
    await supabaseAdmin.from("invite_tokens").delete().eq("email", email);

    // ✅ Create user manually (bypassing Supabase invite system)
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-8), // Temporary password
      email_confirm: true // Auto-confirm email
    });

    if (createUserError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create user: ${createUserError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ User created successfully:", newUser.user.id);

    // ✅ Create user profile
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: newUser.user.id,
      email,
      full_name,
      role,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      registrar: registrar || null,
      is_demo: false,
      password_set: false,
    });

    if (profileError) {
      // Clean up user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create user profile: ${profileError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Generate secure invitation token
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log(`⏰ Invitation expires at: ${expiresAt.toISOString()}`);

    // ✅ Store token in invite_tokens table
    const { error: tokenError } = await supabaseAdmin.from("invite_tokens").insert({
      email,
      token: inviteToken,
      expires_at: expiresAt.toISOString(),
      user_data: {
        user_id: newUser.user.id,
        full_name,
        role,
        mobile_number: mobile_number || "",
        station_id: station_id || "",
        center_address: center_address || "",
        registrar: registrar || ""
      }
    });

    if (tokenError) {
      // Clean up user if token creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create invitation token: ${tokenError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Send custom invitation email
    const baseUrl = "https://548fe184-ba6f-426c-bdf6-cf1a0c71f09d.lovableproject.com";
    const inviteUrl = `${baseUrl}/set-password?token=${inviteToken}`;
    
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-invite-email', {
      body: {
        email,
        full_name,
        inviteUrl,
        expiresAt: expiresAt.toISOString()
      }
    });

    if (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the entire operation if email fails
    } else {
      console.log("✅ Invitation email sent successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email, full_name, role, expires_at: expiresAt.toISOString() },
        invite_link: inviteUrl,
        message: "User invited successfully. Check email for setup instructions.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
