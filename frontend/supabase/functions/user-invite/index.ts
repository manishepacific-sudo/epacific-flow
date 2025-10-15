import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InviteUserSchema = z.object({
  email: z.string().email("Invalid email format").max(255, "Email too long"),
  role: z.enum(["admin", "manager", "user"]),
  full_name: z.string().trim().min(2, "Name too short").max(100, "Name too long"),
  mobile_number: z.string().max(20, "Mobile number too long").optional(),
  station_id: z.string().max(50, "Station ID too long").optional(),
  center_address: z.string().max(500, "Address too long").optional(),
  registrar: z.string().max(100, "Registrar name too long").optional(),
  admin_email: z.string().email("Invalid admin email").optional()
});

type InviteUserRequest = z.infer<typeof InviteUserSchema>;

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 User-invite function started");
    
    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = InviteUserSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid input data",
          details: validationResult.error.format()
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const { 
      email, 
      role, 
      full_name, 
      mobile_number, 
      station_id, 
      center_address, 
      registrar, 
      admin_email 
    } = validationResult.data;
    
    console.log(`📧 Inviting user: ${email} with role: ${role} by admin: ${admin_email}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ Validate admin permissions using database
    if (admin_email) {
      console.log("🔐 Validating admin permissions...");
      
      // Get admin user_id from email
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', admin_email)
        .single();

      if (adminError || !adminProfile) {
        console.error("Admin profile not found:", adminError);
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Admin profile not found" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check role from user_roles table using secure function
      const { data: adminRole, error: roleError } = await supabaseAdmin
        .rpc('get_user_role', { user_id_param: adminProfile.user_id });

      if (roleError || !adminRole) {
        console.error("Failed to get admin role:", roleError);
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Cannot determine admin role" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`✅ Admin validated: ${admin_email} with role: ${adminRole}`);

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

    // ✅ Check if user already exists and clean up if needed
    console.log("🔍 Checking for existing user...");
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers.users.find(u => u.email === email);

    if (userExists) {
      console.log("🧹 User exists, cleaning up...");
      
      // Clean up existing profile and tokens
      await supabaseAdmin.from("profiles").delete().eq("user_id", userExists.id);
      await supabaseAdmin.from("profiles").delete().eq("email", email);
      await supabaseAdmin.from("invite_tokens").delete().eq("email", email);
      await supabaseAdmin.auth.admin.deleteUser(userExists.id);
      
      console.log("✅ Cleanup completed");
    }

    // ✅ Generate secure token FIRST (before creating user)
    const secureToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log(`🎫 Generated secure token: ${secureToken.substring(0, 8)}...`);

    // ✅ Create user using Supabase's built-in invite system
    console.log("👤 Creating user via Supabase invite system...");
    
    // Determine the redirect URL for the invitation
    const redirectUrl = "https://epacific.lovable.app/set-password?token=" + secureToken;
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          full_name,
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          registrar: registrar || "",
          secure_token: secureToken
        }
      }
    );

    if (inviteError) {
      console.error("❌ Supabase invite failed:", inviteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send invitation: ${inviteError.message}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Supabase invitation sent successfully");

    // ✅ Store the secure token in our database
    console.log("💾 Storing secure token in database...");
    const tokenData = {
      email,
      token: secureToken,
      expires_at: expiresAt.toISOString(),
      used: false,
      user_data: {
        user_id: inviteData.user.id, // Use the actual user ID from invite
        email,
        full_name,
        role,
        mobile_number: mobile_number || "",
        station_id: station_id || "",
        center_address: center_address || "",
        registrar: registrar || ""
      }
    };

    const { error: tokenError } = await supabaseAdmin
      .from("invite_tokens")
      .insert(tokenData);

    if (tokenError) {
      console.error("❌ Failed to store token:", tokenError);
      // Clean up the invited user if token storage fails
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create invitation token: ${tokenError.message}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Verify token was stored correctly
    console.log("🔍 Verifying token storage...");
    const { data: verifyToken, error: verifyError } = await supabaseAdmin
      .from("invite_tokens")
      .select('*')
      .eq('token', secureToken)
      .single();

    if (verifyError || !verifyToken) {
      console.error("❌ Token verification failed after storage:", verifyError);
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token storage verification failed"
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Token stored and verified successfully");

    // ✅ Create profile entry (this will be completed when user sets password)
    console.log("👤 Creating initial profile...");
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: inviteData.user.id,
      email,
      full_name,
      role,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      registrar: registrar || null,
      is_demo: false,
      password_set: false, // Will be set to true when password is set
    });

    if (profileError) {
      console.error("❌ Failed to create profile:", profileError);
      // Clean up user and token if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      await supabaseAdmin.from("invite_tokens").delete().eq("token", secureToken);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user profile: ${profileError.message}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ User invitation process completed successfully");
    console.log(`📧 Invitation email sent to ${email} via Supabase SMTP`);
    console.log(`🔗 Password setup link: ${redirectUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User invited successfully via Supabase SMTP",
        user: { 
          id: inviteData.user.id, 
          email, 
          full_name, 
          role 
        },
        invite_link: redirectUrl,
        token: secureToken,
        expires_at: expiresAt.toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("❌ Critical error in user-invite function:", err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || "Unexpected error occurred"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});