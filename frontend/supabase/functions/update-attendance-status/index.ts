import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * IMPORTANT: Base URL Configuration
 * 
 * The BASE_APP_URL must match the domain configured in:
 * - frontend/supabase/config.toml (site_url and additional_redirect_urls)
 * - src/config/constants.ts (BASE_APP_URL)
 * 
 * This ensures consistency across notification emails and deep links.
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

type Body = {
  attendanceId: string;
  action: 'approved' | 'rejected';
  approverUserId?: string;
  remarks?: string;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body: Body = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();
    const update: any = {
      status: body.action,
      approved_at: body.action === 'approved' ? now : null,
      approved_by: body.approverUserId || null,
      remarks: body.remarks || null,
    };

    const { data, error } = await supabase
      .from('attendance')
      .update(update)
      .eq('id', body.attendanceId)
      .select('id, user_id, attendance_date')
      .single();
    if (error) throw error;

    // fetch user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', data.user_id)
      .single();

    const to = profile?.email;
    if (to) {
      const APP_BASE = (BASE_APP_URL || '').replace(/\/+$/, '');
      const subject = body.action === 'approved'
        ? 'Attendance Approved'
        : 'Attendance Rejected — Please Resubmit';
      const dateStr = new Date(data.attendance_date).toLocaleDateString();
      const html = body.action === 'approved'
        ? `Hello ${profile?.full_name || ''},<br><br>Your attendance for ${dateStr} has been approved.<br><br>– Epacific Technologies`
        : `Hello ${profile?.full_name || ''},<br><br>Your attendance for ${dateStr} was rejected.${body.remarks ? `<br>Reason: ${body.remarks}` : ''}<br>Please re-submit your attendance here:<br><a href='${APP_BASE}/attendance'>Mark Attendance</a><br><br>– Epacific Technologies`;

      // read toggle
      let emailEnabled = true;
      try {
        const { data: pref } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'integrations.notifications.preferences')
          .single();
        emailEnabled = pref?.value?.emailEnabled !== false;
      } catch {}

      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ to, subject, html, user_id: data.user_id, type: 'attendance', enabled: emailEnabled })
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Unknown error' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
});


