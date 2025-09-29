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

        await supabaseAdmin.from("profiles").delete().eq("user_id", userExists.id);
        await supabaseAdmin.auth.admin.deleteUser(userExists.id);
      } else {
        await supabaseAdmin.auth.admin.deleteUser(userExists.id);
      }
    }

    // ✅ Generate invitation token with 2-hour expiry
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    console.log(`⏰ Invitation expires at: ${expiresAt.toISOString()}`);

    // ✅ Use correct base URL for Lovable project
    const baseUrl = "https://548fe184-ba6f-426c-bdf6-cf1a0c71f09d.lovableproject.com";
    const inviteUrl = `${baseUrl}/handle-invite`;
    console.log(`🔗 Invite URL: ${inviteUrl}`);

    // ✅ Send invitation - the key is the options object structure
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email, 
      {
        redirectTo: inviteUrl,
        data: {
          full_name,
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          registrar: registrar || "",
          invite_expires_at: expiresAt.toISOString()
        }
      }
    );

    if (inviteError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to send invitation: ${inviteError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Invitation sent successfully via Supabase");

    // ✅ Get the created user
    const { data: newUsers } = await supabaseAdmin.auth.admin.listUsers();
    const newUser = newUsers.users.find(u => u.email === email);

    if (!newUser) {
      return new Response(
        JSON.stringify({ success: false, error: "User invitation sent but could not retrieve user details" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Update user profile
    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      full_name,
      role,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      registrar: registrar || null,
      is_demo: false,
      password_set: false,
    }).eq('user_id', newUser.id);

    if (profileError) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update user profile: ${profileError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.id, email, full_name, role, expires_at: expiresAt.toISOString() },
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
