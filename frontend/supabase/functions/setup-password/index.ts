import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupPasswordRequest {
  token: string;
  email: string;
  password: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, email, password }: SetupPasswordRequest = await req.json();

    if (!token || !email || !password) {
      throw new Error("Token, email, and password are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find user by email and token
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find(u => 
      u.email === email && 
      u.user_metadata?.invite_token === token
    );

    if (!user) {
      throw new Error("Invalid or expired invitation link");
    }

    // Check if token is expired
    const expiresAt = user.user_metadata?.invite_expires_at;
    if (!expiresAt || new Date() > new Date(expiresAt)) {
      // Delete the user and profile since link expired
      await supabaseAdmin.from("profiles").delete().eq("user_id", user.id);
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invitation link has expired",
          expired: true 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Update user password and clear invite token
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password,
        user_metadata: {
          ...user.user_metadata,
          invite_token: null,
          invite_expires_at: null,
        },
      }
    );

    if (updateError) throw updateError;

    // Update profile to mark password as set
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ password_set: true })
      .eq("user_id", user.id);

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password set successfully. You can now log in.",
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (err: any) {
    console.error("Error in setup-password function:", err);
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