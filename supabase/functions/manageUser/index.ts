
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
    console.log("🚀 ManageUser function started");
    const body = await req.json().catch(() => ({}));
    const { action, data }: ManageUserRequest = body;

    console.log("📥 Action:", action, "Data keys:", Object.keys(data || {}));

    if (!action) {
      console.log("❌ Missing action parameter");
      return new Response(JSON.stringify({ success: false, error: "Missing 'action' parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.log("❌ Missing Supabase environment variables");
      return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 🔑 Verify JWT token and get user role
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      console.log("❌ Missing Authorization header");
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
    
    // Get requester's profile and role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", requesterId)
      .maybeSingle();

    let requesterRole: "admin" | "manager" | "user";

    if (profileErr) {
      console.log("❌ Profile lookup failed:", profileErr.message);
      return new Response(JSON.stringify({ success: false, error: "Failed to verify user permissions" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!profile?.role) {
      console.log("🔍 No profile found, checking if this should be bootstrapped as admin");
      
      // Check if there are any admin users in the system
      const { data: existingAdmins, error: adminCheckErr } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      if (adminCheckErr) {
        console.log("❌ Admin check failed:", adminCheckErr.message);
        return new Response(JSON.stringify({ success: false, error: "Failed to verify system state" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (!existingAdmins || existingAdmins.length === 0) {
        console.log("🛠️ Bootstrapping first user as admin");
        requesterRole = "admin";
      } else {
        console.log("❌ User has no role and system already has admins");
        return new Response(JSON.stringify({ success: false, error: "User has no permissions in system" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      requesterRole = profile.role as "admin" | "manager" | "user";
    }

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
        console.log("👤 Creating new user");
        const { email, role, full_name, mobile_number, station_id, center_address } = data;

        if (!email || !role) {
          console.log("❌ Missing required fields for user creation");
          return new Response(JSON.stringify({ success: false, error: "Email and role are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const defaultPassword = "TempPass123!";
        console.log("🔐 Creating user with email:", email, "role:", role);

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

        if (createErr) {
          console.log("❌ User creation failed:", createErr.message);
          throw createErr;
        }

        if (!newUser?.user?.id) {
          console.log("❌ No user ID returned from creation");
          throw new Error("User creation returned no ID");
        }

        const userId = newUser.user.id;
        console.log("✅ Auth user created with ID:", userId);

        // Create profile entry
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
          console.log("❌ Profile creation failed:", profileErr.message);
          // Clean up auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw profileErr;
        }

        console.log("✅ Profile created successfully");

        // If this is the first user and we bootstrapped them as admin, update their profile
        if (requesterRole === "admin" && !profile?.role) {
          console.log("🛠️ Updating bootstrap admin profile");
          const { error: bootstrapErr } = await supabaseAdmin.from("profiles").upsert({
            user_id: requesterId,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || "Admin",
            role: "admin",
            mobile_number: "",
            station_id: "",
            center_address: "",
            password_set: true,
            is_demo: false,
          });

          if (bootstrapErr) {
            console.log("⚠️ Bootstrap profile update failed:", bootstrapErr.message);
            // Don't fail the entire operation for this
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          user: { id: userId, email, role }, 
          password: defaultPassword 
        }), {
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
        console.log("❌ Invalid action:", action);
        return new Response(JSON.stringify({ success: false, error: "Invalid action. Supported actions: create, setPassword, delete" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (err: any) {
    console.error("❌ ManageUser function error:", err);
    console.error("❌ Error details:", {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint
    });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err?.message || "Unexpected error occurred",
      details: err?.code ? `Code: ${err.code}` : undefined
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
