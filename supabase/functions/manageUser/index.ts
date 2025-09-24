
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
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
    const body = await req.json().catch(() => ({}));
    const { action, data }: ManageUserRequest = body;

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "Missing 'action'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 🔑 Verify JWT token and get user role
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify JWT token with service role client
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(authHeader);
    if (authErr || !authData?.user) {
      console.log("❌ JWT verification failed:", authErr?.message);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized: invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requesterId = authData.user.id;
    console.log("🔍 Verifying role for user:", requesterId);
    
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", requesterId)
      .single();

    if (profileErr || !profile?.role) {
      console.log("❌ Profile/role lookup failed:", profileErr?.message);
      return new Response(JSON.stringify({ success: false, error: "Role not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const requesterRole = profile.role as "admin" | "manager" | "user";
    console.log("✅ Requester role verified:", requesterRole);

    // 🔒 Permission check
    if (action === "create") {
      const targetRole = data.role;
      if (!data.email || !targetRole) {
        return new Response(JSON.stringify({ success: false, error: "Email and role are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check permissions based on requester role
      if (requesterRole === "user") {
        return new Response(JSON.stringify({ success: false, error: "Users cannot create accounts" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (requesterRole === "manager" && targetRole === "admin") {
        return new Response(JSON.stringify({ success: false, error: "Managers cannot create admin accounts" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log(`✅ Permission granted: ${requesterRole} can create ${targetRole}`);
    }

    if (action === "delete") {
      const { userId } = data;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "User ID is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check permissions for deletion
      if (requesterRole === "user") {
        return new Response(JSON.stringify({ success: false, error: "Users cannot delete accounts" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check if manager is trying to delete an admin
      if (requesterRole === "manager") {
        const { data: targetProfile, error: targetProfileErr } = await supabaseAdmin
          .from("profiles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (targetProfileErr) {
          console.log("❌ Could not verify target user role:", targetProfileErr.message);
          return new Response(JSON.stringify({ success: false, error: "Could not verify target user permissions" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (targetProfile?.role === "admin") {
          return new Response(JSON.stringify({ success: false, error: "Managers cannot delete admin accounts" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      console.log(`✅ Permission granted: ${requesterRole} can delete user ${userId}`);
    }

    // 🛠 Handle actions
    switch (action) {
      case "create": {
        const { email, role, full_name, mobile_number, station_id, center_address } = data;

        const defaultPassword = "TempPass123!";

        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || email?.split("@")[0],
            role,
            mobile_number: mobile_number || "",
            station_id: station_id || "",
            center_address: center_address || "",
          },
        });

        if (createErr) throw createErr;

        const userId = newUser?.user?.id;
        const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
          user_id: userId,
          email,
          full_name: full_name || email?.split("@")[0],
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          password_set: false,
          is_demo: false,
        });

        if (profileErr) {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw profileErr;
        }

        return new Response(JSON.stringify({ success: true, user: { id: userId, email, role }, password: defaultPassword }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "setPassword": {
        const { userId, password } = data;
        if (!userId || !password) {
          return new Response(JSON.stringify({ success: false, error: "User ID + password required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (updateErr) throw updateErr;

        await supabaseAdmin.from("profiles").update({ password_set: true }).eq("user_id", userId);

        return new Response(JSON.stringify({ success: true, message: "Password updated" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "delete": {
        const { userId } = data;
        if (!userId) {
          return new Response(JSON.stringify({ success: false, error: "User ID required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);

        return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (err: any) {
    console.error("❌ Function error:", err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
