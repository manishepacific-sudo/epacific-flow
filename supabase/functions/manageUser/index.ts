import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: "create" | "setPassword" | "delete";
  data: {
    email?: string;
    role?: "admin" | "manager" | "user";
    full_name?: string;
    mobile_number?: string;
    station_id?: string;
    center_address?: string;
    userId?: string;
    password?: string;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data }: ManageUserRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Service role required
    );

    switch (action) {
      case "create": {
        const { email, role, full_name, mobile_number, station_id, center_address } = data;

        if (!email || !role) {
          throw new Error("Email and role are required");
        }

        // Invite user
        const { data: inviteData, error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
              full_name: full_name || email.split("@")[0],
              role,
              mobile_number: mobile_number || "",
              station_id: station_id || "",
              center_address: center_address || "",
            },
          });

        if (inviteError) throw inviteError;

        // Create profile
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          user_id: inviteData.user.id,
          email,
          full_name: full_name || email.split("@")[0],
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          is_demo: false,
          password_set: false,
        });

        if (profileError) throw profileError;

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: inviteData.user.id,
              email,
              role,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "setPassword": {
        const { userId, password } = data;
        if (!userId || !password) {
          throw new Error("User ID and password are required");
        }

        const { data: updatedUser, error: updateError } =
          await supabaseAdmin.auth.admin.updateUserById(userId, { password });

        if (updateError) throw updateError;

        await supabaseAdmin.from("profiles").update({ password_set: true }).eq("user_id", userId);

        return new Response(
          JSON.stringify({ success: true, user: updatedUser }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "delete": {
        const { userId } = data;
        if (!userId) {
          throw new Error("User ID required");
        }

        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true, message: "User deleted successfully" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
