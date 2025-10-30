import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * IMPORTANT: Base URL Configuration
 * 
 * The BASE_APP_URL must match the domain configured in:
 * - frontend/supabase/config.toml (site_url and additional_redirect_urls)
 * - src/config/constants.ts (BASE_APP_URL)
 * 
 * This ensures consistency across invitation emails, redirects, and deep links.
 * 
 * Environment Variable: Set BASE_APP_URL in Supabase function environment variables.
 * - Production: https://login.epacifictechnologies.com
 * - Local Development: http://localhost:5173 (or your local dev port)
 */
const BASE_APP_URL = Deno.env.get('BASE_APP_URL') || "https://login.epacifictechnologies.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  role: "admin" | "manager" | "user";
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
    const { 
      email, 
      role, 
      full_name, 
      mobile_number, 
      station_id, 
      center_address, 
      registrar, 
      admin_email 
    }: InviteUserRequest = await req.json();
    
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
      const demoCredentials: Record<string, 'admin' | 'manager'> = {
        'admin@epacific.com': 'admin',
        'manager@epacific.com': 'manager'
      };

      let adminRole: 'admin' | 'manager' | null = null;

      if (demoCredentials[admin_email as keyof typeof demoCredentials]) {
        adminRole = demoCredentials[admin_email as keyof typeof demoCredentials];
        console.log(`✅ Demo admin detected: ${admin_email} with role: ${adminRole}`);
      } else {
        // First get the user_id from profiles
        const { data: adminProfile, error: adminError } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', admin_email)
          .single();

        if (adminError || !adminProfile) {
          console.error("❌ Admin profile not found:", { email: admin_email, error: adminError });
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: Admin profile not found" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Now get the role from user_roles table
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', adminProfile.user_id)
          .single();

        if (roleError || !roleData) {
          console.error("❌ Admin role not found:", { user_id: adminProfile.user_id, error: roleError });
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: Admin role not found" }),
            { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        adminRole = roleData.role;
        console.log(`✅ Database admin found: ${admin_email} with role: ${adminRole}`);
      }

      if (!adminRole || !['admin', 'manager'].includes(adminRole)) {
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

    // ✅ Check if user already exists and clean up if needed (fast path, avoids scanning all auth users)
    console.log("🔍 Checking for existing user by email in profiles...");
    const { data: existingProfileByEmail, error: existingProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfileErr) {
      console.warn("⚠️ Error checking existing profile by email (will continue):", existingProfileErr);
    }

    if (existingProfileByEmail?.user_id) {
      console.log("🧹 Existing profile found, cleaning up auth user and related records...", existingProfileByEmail.user_id);
      try {
        await supabaseAdmin.auth.admin.deleteUser(existingProfileByEmail.user_id);
      } catch (delErr) {
        console.warn("⚠️ Failed to delete existing auth user by user_id (will continue):", delErr);
      }

      await supabaseAdmin.from('profiles').delete().eq('user_id', existingProfileByEmail.user_id);
    }

    // Always clean up any residual records by email
    await supabaseAdmin.from('profiles').delete().eq('email', email);
    await supabaseAdmin.from('invite_tokens').delete().eq('email', email);
    console.log("✅ Cleanup completed (targeted)");

    // ✅ Generate secure token FIRST (before creating user)
    const secureToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log(`🎫 Generated secure token: ${secureToken.substring(0, 8)}...`);

    // ✅ Create user manually (don't use Supabase email - we'll use custom SMTP)
    console.log("👤 Creating user manually...");
    
    // Determine the redirect URL for the invitation
    const APP_BASE = (BASE_APP_URL || '').replace(/\/+$/, '');
    const redirectUrl = `${APP_BASE}/set-password?token=${secureToken}`;
    
    const tempPassword = crypto.randomUUID(); // Temporary password (user will set their own)
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false, // Don't require email confirmation
      user_metadata: {
        full_name,
        role,
        mobile_number: mobile_number || "",
        station_id: station_id || "",
        center_address: center_address || "",
        registrar: registrar || "",
        secure_token: secureToken
      }
    });

    if (createUserError || !userData?.user) {
      console.error("❌ Failed to create user:", createUserError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create user: ${createUserError?.message || 'Unknown error'}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;
    console.log("✅ User created successfully:", userId);

    // ✅ Store the secure token in our database
    console.log("💾 Storing secure token in database...");
    const tokenData = {
      email,
      token: secureToken,
      expires_at: expiresAt.toISOString(),
      used: false,
      user_data: {
        user_id: userId, // Use the user ID from invite or manual creation
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
      await supabaseAdmin.auth.admin.deleteUser(userId);
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
      await supabaseAdmin.auth.admin.deleteUser(userId);
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
    const profilePayload = {
      user_id: userId,
      email,
      full_name,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      registrar: registrar || null,
      is_demo: false,
      password_set: false, // Will be set to true when password is set
    };

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(profilePayload);

    if (profileError) {
      if (profileError.code === '23505') {
        console.log("ℹ️ Profile already exists. Updating existing profile entry.");
        const { error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update(profilePayload)
          .eq("user_id", userId);

        if (profileUpdateError) {
          console.error("❌ Failed to update existing profile:", profileUpdateError);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          await supabaseAdmin.from("invite_tokens").delete().eq("token", secureToken);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to update existing user profile: ${profileUpdateError.message}`
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        console.error("❌ Failed to create profile:", profileError);
        // Clean up user and token if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from("invite_tokens").delete().eq("token", secureToken);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user profile: ${profileError.message}`
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ✅ Create role entry in user_roles table
    console.log("🔐 Creating user role...");
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: role,
    });

    if (roleError) {
      if (roleError.code === '23505') {
        console.log("ℹ️ User role already exists. Updating role entry.");
        const { error: roleUpdateError } = await supabaseAdmin
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId);

        if (roleUpdateError) {
          console.error("❌ Failed to update existing user role:", roleUpdateError);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
          await supabaseAdmin.from("invite_tokens").delete().eq("token", secureToken);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to update user role: ${roleUpdateError.message}`
            }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      } else {
        console.error("❌ Failed to create user role:", roleError);
        // Clean up user, profile and token if role creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
        await supabaseAdmin.from("invite_tokens").delete().eq("token", secureToken);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to create user role: ${roleError.message}`
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    console.log("✅ User invitation process completed successfully");
    
    // ✅ Send invitation email via custom SMTP (Hostinger)
    console.log(`📧 Sending invitation email to ${email} via custom SMTP...`);
    let inviteEmailError: string | null = null;
    let emailSent = false;

    try {
      // Build HTML email template
      const LOGO_URL = `${APP_BASE}/epacific-logo.png`;
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Epacific Technologies</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <img src="${LOGO_URL}" alt="Epacific Technologies" style="max-width: 180px; height: auto; margin-bottom: 20px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Epacific!</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #2d3748; margin: 0 0 20px;">Hello <strong>${full_name}</strong>,</p>
      <p style="font-size: 16px; color: #4a5568; line-height: 1.6; margin: 0 0 30px;">
        You've been invited to join Epacific Technologies as a <strong>${role}</strong>. 
        Click the button below to set up your account and create your password.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${redirectUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
          Set Up Your Account
        </a>
      </div>
      <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 16px; margin: 30px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #4a5568;">
          <strong>Note:</strong> This invitation link will expire in 24 hours. If you didn't request this invitation, please ignore this email.
        </p>
      </div>
      <p style="font-size: 14px; color: #718096; margin: 20px 0 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 12px; color: #a0aec0; word-break: break-all; margin: 10px 0 0;">
        ${redirectUrl}
      </p>
    </div>
    <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #a0aec0;">
        © ${new Date().getFullYear()} Epacific Technologies Pvt. Ltd. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

      // Call custom SMTP function
      const { error: smtpError } = await supabaseAdmin.functions.invoke('send-email-notification', {
        body: {
          to: email,
          subject: `Welcome to Epacific Technologies - Set Up Your Account`,
          html: emailHtml,
          user_id: userId,
          type: 'attendance', // Using attendance type as placeholder
          enabled: true
        }
      });

      if (smtpError) {
        console.error("❌ SMTP email failed:", smtpError);
        inviteEmailError = smtpError.message || 'Failed to send email via SMTP';
      } else {
        console.log("✅ Invitation email sent successfully via Hostinger SMTP");
        emailSent = true;
      }
    } catch (emailError: any) {
      console.error("❌ Error sending invitation email:", emailError);
      inviteEmailError = emailError.message || 'Failed to send invitation email';
    }
    
    console.log(`🔗 Password setup link: ${redirectUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent 
          ? "User invited successfully via Hostinger SMTP" 
          : "User created successfully but email sending failed. Please share the invite link manually.",
        user: { 
          id: userId, 
          email, 
          full_name, 
          role 
        },
        invite_link: redirectUrl,
        token: secureToken,
        expires_at: expiresAt.toISOString(),
        emailError: inviteEmailError // Include error if email failed
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