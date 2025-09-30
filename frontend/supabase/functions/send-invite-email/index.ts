import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Initialize SMTP client with Hostinger credentials
const smtp = new SMTPClient({
  connection: {
    hostname: Deno.env.get("SMTP_HOST") || "",
    port: parseInt(Deno.env.get("SMTP_PORT") || "587"),
    tls: true,
    auth: {
      username: Deno.env.get("SMTP_USER") || "",
      password: Deno.env.get("SMTP_PASS") || "",
    },
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  full_name: string;
  inviteUrl: string;
  expiresAt: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Send-invite-email function started");
    const { email, full_name, inviteUrl, expiresAt }: InviteEmailRequest = await req.json();

    // Format expiry time for display
    const expiryDate = new Date(expiresAt);
    const expiryString = expiryDate.toLocaleDateString() + " at " + expiryDate.toLocaleTimeString();

    console.log("📧 Sending email to:", email);

    // Send email using custom SMTP provider (Hostinger)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Account Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #f8f9fa; padding: 30px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to E-Pacific!</h1>
            </div>
            
            <p>Hello ${full_name},</p>
            
            <p>You have been invited to join the E-Pacific system. To get started, please set up your password by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${inviteUrl}" class="button">Set Up Your Password</a>
            </div>
            
            <p><strong>Important:</strong> This invitation link will expire on ${expiryString}.</p>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e9ecef; padding: 10px; border-radius: 3px;">${inviteUrl}</p>
            
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>Best regards,<br>The E-Pacific Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await smtp.send({
      from: Deno.env.get("SMTP_USER") || "noreply@yourdomain.com",
      to: email,
      subject: "Welcome to E-Pacific - Set Up Your Password",
      html: htmlContent,
    });

    console.log("✅ Invitation email sent successfully via custom SMTP");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation email sent successfully via custom SMTP",
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("❌ Error in send-invite-email function:", err);
    
    // Provide more specific error information for SMTP issues
    let errorMessage = err.message || "Unexpected error";
    if (err.message?.includes("authentication")) {
      errorMessage = "SMTP authentication failed. Please check your credentials.";
    } else if (err.message?.includes("connection")) {
      errorMessage = "Failed to connect to SMTP server. Please check your SMTP settings.";
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: err.message
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});