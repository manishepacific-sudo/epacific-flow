import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetPasswordRequest {
  token: string;
  password?: string;
  validate_only?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Set-password-with-token function started");
    const { token, password, validate_only }: SetPasswordRequest = await req.json();
    
    console.log("🔍 Received token:", token ? `${token.substring(0, 8)}...` : "MISSING");
    console.log("🔍 Validate only:", validate_only);
    console.log("🔍 Password provided:", !!password);

    if (!token) {
      console.error("❌ No token provided in request body");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token is required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!validate_only && !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Password is required" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ Verify token is valid and not used
    console.log("🔍 Verifying token in database...");
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('invite_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    console.log("📊 Token query result:", { 
      found: !!tokenData, 
      error: tokenError?.message,
      tokenId: tokenData?.id,
      email: tokenData?.email,
      used: tokenData?.used,
      expires: tokenData?.expires_at
    });

    if (tokenError || !tokenData) {
      console.error("❌ Token verification failed:", tokenError);
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
    const now = new Date();
    console.log("⏰ Token expiry check:", { 
      expires: expiresAt.toISOString(), 
      now: now.toISOString(), 
      expired: expiresAt < now 
    });
    
    if (expiresAt < now) {
      console.error("❌ Token has expired");
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

    // ✅ If this is just validation, return success with user data
    if (validate_only) {
      return new Response(
        JSON.stringify({
          success: true,
          user_data: userData,
          message: "Token is valid"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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