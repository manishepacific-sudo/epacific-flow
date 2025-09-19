import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  full_name: string;
  role: string;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, role, inviteLink }: InvitationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Epacific Technologies <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Epacific Technologies - Set Your Password",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Epacific Technologies</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">Hello ${full_name},</h2>
            
            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              You've been invited to join our platform as a <strong style="color: #667eea;">${role}</strong>. 
              To get started, please set up your password by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 14px 28px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                Set Your Password
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
            </p>
            
            <p style="color: #888; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
              This invitation will expire in 24 hours. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2024 Epacific Technologies. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);