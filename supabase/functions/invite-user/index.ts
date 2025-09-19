import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  role: 'admin' | 'manager' | 'user';
  full_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, full_name }: InviteUserRequest = await req.json();
    
    console.log(`Inviting user: ${email} with role: ${role}`);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend for email sending
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get current user to verify admin permissions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: currentUser } = await supabaseAdmin.auth.getUser(token);
    
    if (!currentUser.user) {
      throw new Error('Invalid authentication');
    }

    // Verify current user is admin
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', currentUser.user.id)
      .single();

    if (!currentProfile || currentProfile.role !== 'admin') {
      throw new Error('Only admins can invite users');
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers.users.some(user => user.email === email);
    
    if (userExists) {
      throw new Error('User with this email already exists');
    }

    // Create magic link redirect URL
    const redirectUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '')}/set-password`;

    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          full_name: full_name || email.split('@')[0],
          role,
          invited_by: currentUser.user.id
        }
      }
    );

    if (inviteError) {
      console.error("Invite error:", inviteError);
      throw inviteError;
    }

    console.log("User invited successfully:", inviteData);

    // Create profile with password_set = false
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: inviteData.user.id,
        email: email,
        full_name: full_name || email.split('@')[0],
        role: role,
        is_demo: false,
        password_set: false,
        mobile_number: '',
        station_id: '',
        center_address: ''
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }

    // Send custom invitation email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3B82F6;">You're Invited!</h1>
        </div>
        
        <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2>Welcome to our platform</h2>
          <p>Hello ${full_name || email.split('@')[0]},</p>
          <p>You've been invited to join our platform with the role of <strong>${role}</strong>.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${redirectUrl}?token=${inviteData.user.id}" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Set Your Password
          </a>
        </div>
        
        <div style="color: #6B7280; font-size: 14px; margin-top: 20px;">
          <p>This invitation will expire in 24 hours.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Platform <noreply@resend.dev>",
      to: [email],
      subject: `You're invited to join our platform as ${role}`,
      html: emailHtml
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      // Don't throw here - user was created successfully, just email failed
    }

    console.log("Invitation email sent:", emailData);

    return new Response(JSON.stringify({ 
      message: "User invited successfully",
      user: {
        id: inviteData.user.id,
        email: email,
        role: role,
        full_name: full_name
      },
      emailSent: !emailError
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to invite user"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);