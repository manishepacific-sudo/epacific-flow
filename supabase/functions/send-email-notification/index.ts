import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createTransport } from "npm:nodemailer@6.9.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  to: string;
  subject: string;
  html: string;
  user_id?: string;
  type?: 'report' | 'payment' | 'attendance';
  enabled?: boolean; // feature toggle from settings
};

async function logEmail(supabaseAdmin: ReturnType<typeof createClient>, params: { user_id?: string; type?: string; status: string; subject: string; to: string; error?: string }) {
  try {
    await supabaseAdmin.from('email_notifications').insert({
      user_id: params.user_id || null,
      type: params.type || null,
      status: params.status,
      subject: params.subject,
      to_email: params.to,
      error: params.error || null,
    });
  } catch (e) {
    console.error('Failed to log email notification:', e);
  }
}

// Send email using Hostinger SMTP via nodemailer
async function sendSMTP(payload: Payload): Promise<{ ok: boolean; error?: string }> {
  const host = Deno.env.get('SMTP_HOST') || '';
  const port = Number(Deno.env.get('SMTP_PORT') || '587');
  const user = Deno.env.get('SMTP_USER') || '';
  const pass = Deno.env.get('SMTP_PASS') || '';

  if (!host || !port || !user || !pass) {
    const error = 'SMTP credentials missing (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)';
    console.error('❌', error);
    return { ok: false, error };
  }

  console.log(`📧 Configuring SMTP: ${host}:${port} with user: ${user}`);

  try {
    // Create nodemailer transport for Hostinger SMTP
    const transporter = createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    console.log(`📨 Sending email to: ${payload.to}`);
    console.log(`📋 Subject: ${payload.subject}`);

    // Send email
    const info = await transporter.sendMail({
      from: `"Epacific Technologies" <${user}>`, // sender address
      to: payload.to, // recipient
      subject: payload.subject,
      html: payload.html,
    });

    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return { ok: true };
  } catch (error: any) {
    console.error('❌ SMTP send error:', error);
    return { 
      ok: false, 
      error: error.message || 'Failed to send email via SMTP' 
    };
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: Payload = await req.json();

    if (payload.enabled === false) {
      await logEmail(supabaseAdmin, { user_id: payload.user_id, type: payload.type, status: 'sent', subject: payload.subject, to: payload.to });
      return new Response(JSON.stringify({ success: true, skipped: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const result = await sendSMTP(payload);
    await logEmail(supabaseAdmin, { user_id: payload.user_id, type: payload.type, status: result.ok ? 'sent' : 'failed', subject: payload.subject, to: payload.to, error: result.error });

    if (!result.ok) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e: any) {
    console.error('send-email-notification error:', e);
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});


