// supabase/functions/invite-user.ts

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { email, full_name, role, mobile_number, station_id, center_address } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Set expiration for invite link (2 hours from now)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); 
    console.log(`⏰ Invitation expires at: ${expiresAt.toISOString()}`);

    // ✅ Use localhost only for dev, otherwise use your live domain
    const baseUrl =
      Deno.env.get("ENVIRONMENT") === "development"
        ? "http://localhost:3000"
        : "https://epacific-flow.lovable.app";

    const inviteUrl = `${baseUrl}/handle-invite`;

    console.log(`🔗 Invite URL: ${inviteUrl}`);
    console.log(`📧 Attempting to send invitation via Supabase to: ${email}`);

    // Send the invitation email
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
        data: {
          full_name,
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          invite_expires_at: expiresAt.toISOString(),
        },
      });

    if (inviteError) {
      console.error("❌ Invite error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 500 });
    }

    console.log("✅ Invite sent:", inviteData);
    return new Response(JSON.stringify({ message: "Invitation sent successfully", inviteData }), {
      status: 200,
    });

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error occurred" }), { status: 500 });
  }
});
