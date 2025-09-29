import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetPasswordRequest {
  token: string;
  password: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Set-password-with-token function started");
    const { token, password }: SetPasswordRequest = await req.json();

    if (!token || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token and password are required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ Verify token is valid and not used
    console.log("🔍 Verifying token...");
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid or expired invitation token" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ✅ Check if token has expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "This invitation token has expired" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userData = tokenData.user_data as any;
    console.log("✅ Token valid for user:", userData.user_id);

    // ✅ Update user password using admin privileges
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user_id,
      { password: password }
    );

    if (authError) {
      console.error("❌ Failed to update password:", authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update password: ${authError.message}` 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Password updated successfully");

    // ✅ Mark token as used
    const { error: tokenUpdateError } = await supabaseAdmin
      .from('invite_tokens')
      .update({ used: true })
      .eq('token', token);

    if (tokenUpdateError) {
      console.warn("⚠️ Failed to mark token as used:", tokenUpdateError);
    }

    // ✅ Update profile to mark password as set
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ password_set: true })
      .eq('user_id', userData.user_id);

    if (profileError) {
      console.warn("⚠️ Failed to update profile password_set flag:", profileError);
    }

    console.log("✅ Password setup completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password set successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (err: any) {
    console.error("❌ Error in set-password-with-token function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});