import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "npm:resend@4.0.0";

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
      throw new Error("Email, role, and full name are required");
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
          throw new Error("Unauthorized: Admin profile not found");
        }
        
        adminRole = adminProfile.role;
        console.log(`✅ Database admin found: ${admin_email} with role: ${adminRole}`);
      }
      
      if (!['admin', 'manager'].includes(adminRole)) {
        console.error("❌ Insufficient permissions:", adminRole);
        throw new Error("Unauthorized: Insufficient permissions to invite users");
      }
      
      // Manager role restrictions
      if (adminRole === 'manager' && role === 'manager') {
        console.error("❌ Manager cannot create other managers");
        throw new Error("Managers cannot create other manager accounts");
      }
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Check if user already exists
    console.log("🔍 Checking for existing user...");
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);
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
        
        if (!existingProfile.is_demo) {
          // For non-demo users, check if password is already set
          if (existingProfile.password_set) {
            console.error("❌ User already exists with password set");
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "User with this email already exists and has an active account. Please use a different email address.",
                userExists: true
              }),
              {
                status: 409, // Conflict status code for duplicate resource
                headers: { "Content-Type": "application/json", ...corsHeaders },
              }
            );
          }
          
          // If password not set, this is a resend invitation - update existing user
          console.log(`🔄 Resending invitation to existing user: ${email}`);
          
          // Generate new invitation token
          const inviteToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
          
          // Update user metadata with new token
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userExists.id, {
            user_metadata: {
              ...userExists.user_metadata,
              invite_token: inviteToken,
              invite_expires_at: expiresAt.toISOString(),
            },
          });
          
          if (updateError) throw updateError;
          
          // Update profile with any new information
          const { error: profileUpdateError } = await supabaseAdmin
            .from("profiles")
            .update({
              full_name,
              role,
              mobile_number: mobile_number || existingProfile.mobile_number,
              station_id: station_id || existingProfile.station_id,
              center_address: center_address || existingProfile.center_address,
            })
            .eq("user_id", userExists.id);
            
          if (profileUpdateError) throw profileUpdateError;
          
          // Send new invitation email
          const inviteUrl = `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app')}/set-password?token=${inviteToken}&email=${encodeURIComponent(email)}`;
          
          await resend.emails.send({
            from: "noreply@epacific.com",
            to: [email],
            subject: "ePacific - Password Setup Reminder",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">ePacific - Complete Your Setup</h2>
                <p>Hello ${full_name},</p>
                <p>This is a reminder to complete your ePacific account setup. Please click the link below to set your password.</p>
                <div style="margin: 30px 0;">
                  <a href="${inviteUrl}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Set Your Password
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  This link will expire in 10 minutes.
                </p>
              </div>
            `,
          });
          
          return new Response(
            JSON.stringify({
              success: true,
              user: {
                id: userExists.id,
                email,
                role,
                invite_token: inviteToken,
                expires_at: expiresAt.toISOString(),
              },
              message: "Invitation resent successfully.",
            }),
            { 
              status: 200, 
              headers: { "Content-Type": "application/json", ...corsHeaders } 
            }
          );
        }

        // Delete existing demo user and profile
        try {
          console.log(`🗑️ Deleting existing demo profile for: ${email}`);
          await supabaseAdmin.from("profiles").delete().eq("user_id", userExists.id);
          console.log(`🗑️ Deleting existing demo auth user for: ${email}`);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
          console.log(`✅ Deleted existing demo user: ${email}`);
        } catch (deleteError) {
          console.error("❌ Error deleting existing demo user:", deleteError);
          throw new Error("Failed to remove existing demo user");
        }
      } else {
        // User exists in auth but no profile - delete auth user
        try {
          console.log(`🗑️ Deleting auth user without profile: ${email}`);
          await supabaseAdmin.auth.admin.deleteUser(userExists.id);
          console.log(`✅ Deleted auth user without profile: ${email}`);
        } catch (deleteError) {
          console.error("❌ Error deleting auth user:", deleteError);
          throw new Error("Failed to remove existing auth user");
        }
      }
    }

    // Generate invitation token (expires in 10 minutes)
    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user with temporary password
    const tempPassword = crypto.randomUUID();
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        mobile_number: mobile_number || "",
        station_id: station_id || "",
        center_address: center_address || "",
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString(),
      },
    });

    if (createError) throw createError;

    // Create profile entry
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userData.user.id,
      email,
      full_name,
      role,
      mobile_number: mobile_number || "",
      station_id: station_id || "",
      center_address: center_address || "",
      is_demo: false,
      password_set: false, // User needs to set password
    });

    if (profileError) throw profileError;

    // Send invitation email
    const inviteUrl = `${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovable.app')}/set-password?token=${inviteToken}&email=${encodeURIComponent(email)}`;
    
    const { error: emailError } = await resend.emails.send({
      from: "noreply@epacific.com",
      to: [email],
      subject: "You're invited to join ePacific",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to ePacific</h2>
          <p>Hello ${full_name},</p>
          <p>You've been invited to join ePacific as a ${role}. Please click the link below to set your password and complete your account setup.</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Set Your Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This invitation link will expire in 10 minutes. If the link expires, please contact your administrator for a new invitation.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the request if email fails, user was still created
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userData.user.id,
          email,
          role,
          invite_token: inviteToken,
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
        error: err.message 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});