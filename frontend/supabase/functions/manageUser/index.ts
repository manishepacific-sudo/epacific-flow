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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 ManageUser function started");
    
    // Parse request body
    let body: ManageUserRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.log("❌ Invalid JSON in request body");
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { action, data } = body;
    console.log("📥 Action:", action, "Data keys:", Object.keys(data || {}));

    if (!action) {
      console.log("❌ Missing action parameter");
      return new Response(JSON.stringify({ success: false, error: "Missing 'action' parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!data) {
      console.log("❌ Missing data parameter");
      return new Response(JSON.stringify({ success: false, error: "Missing 'data' parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get Supabase environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.log("❌ Missing Supabase environment variables");
      return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify JWT token and get user role
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
        
        // Create bootstrap admin profile
        const { error: bootstrapErr } = await supabaseAdmin.from("profiles").upsert({
          user_id: requesterId,
          email: authData.user.email || "",
          full_name: authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || "Admin",
          role: "admin",
          mobile_number: "",
          station_id: "",
          center_address: "",
          password_set: true,
          is_demo: false,
        });

        if (bootstrapErr) {
          console.log("❌ Bootstrap profile creation failed:", bootstrapErr.message);
          return new Response(JSON.stringify({ success: false, error: "Failed to bootstrap admin user" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        console.log("✅ Bootstrap admin profile created");
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

    // Permission checks based on action
    if (action === "create") {
      const targetRole = data.role;
      if (!data.email || !targetRole) {
        console.log("❌ Missing required fields for user creation");
        return new Response(JSON.stringify({ success: false, error: "Email and role are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check permissions based on requester role
      if (requesterRole === "user") {
        console.log("❌ Users cannot create accounts");
        return new Response(JSON.stringify({ success: false, error: "Users cannot create accounts" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (requesterRole === "manager" && targetRole === "admin") {
        console.log("❌ Managers cannot create admin accounts");
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
        console.log("❌ Missing userId for deletion");
        return new Response(JSON.stringify({ success: false, error: "User ID is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Check permissions for deletion
      if (requesterRole === "user") {
        console.log("❌ Users cannot delete accounts");
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
          .maybeSingle();

        if (targetProfileErr) {
          console.log("❌ Could not verify target user role:", targetProfileErr.message);
          return new Response(JSON.stringify({ success: false, error: "Could not verify target user permissions" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        if (targetProfile?.role === "admin") {
          console.log("❌ Managers cannot delete admin accounts");
          return new Response(JSON.stringify({ success: false, error: "Managers cannot delete admin accounts" }), {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      console.log(`✅ Permission granted: ${requesterRole} can delete user ${userId}`);
    }

    // Handle actions
    switch (action) {
      case "create": {
        console.log("👤 Creating new user");
        const { email, role, full_name, mobile_number, station_id, center_address } = data;

        const defaultPassword = "TempPass123!";
        console.log("🔐 Creating user with email:", email, "role:", role);

        try {
          const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: email!,
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

          // Create profile entry with upsert to handle duplicates
          const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
            user_id: userId,
            email: email!,
            full_name: full_name || email?.split("@")[0] || "",
            role: role!,
            mobile_number: mobile_number || "",
            station_id: station_id || "",
            center_address: center_address || "",
            password_set: false,
            is_demo: false,
          }, {
            onConflict: 'user_id'
          });

          if (profileErr) {
            console.log("❌ Profile creation failed:", profileErr.message);
            // Clean up auth user if profile creation fails
            try {
              await supabaseAdmin.auth.admin.deleteUser(userId);
            } catch (cleanupErr) {
              console.log("⚠️ Failed to cleanup auth user:", cleanupErr);
            }
            throw profileErr;
          }

          console.log("✅ Profile created successfully");

          // Skip Supabase's built-in invitation system as it redirects to lovable.dev
          // The user-invite function should be used instead for custom invitations
          console.log("✅ User created successfully. Use user-invite function for custom invitations.");

          return new Response(JSON.stringify({ 
            success: true, 
            user: { id: userId, email, role }, 
            password: defaultPassword 
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        } catch (userCreationError: any) {
          console.log("❌ User creation process failed:", userCreationError.message);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `User creation failed: ${userCreationError.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      case "setPassword": {
        console.log("🔐 Setting password for user");
        const { userId, password } = data;
        if (!userId || !password) {
          console.log("❌ Missing userId or password");
          return new Response(JSON.stringify({ success: false, error: "User ID and password are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        try {
          const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
          if (updateErr) {
            console.log("❌ Password update failed:", updateErr.message);
            throw updateErr;
          }

          await supabaseAdmin.from("profiles").update({ password_set: true }).eq("user_id", userId);

          console.log("✅ Password updated successfully");
          return new Response(JSON.stringify({ success: true, message: "Password updated" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        } catch (passwordError: any) {
          console.log("❌ Password update process failed:", passwordError.message);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `Password update failed: ${passwordError.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }

      case "delete": {
        console.log("🗑️ Deleting user");
        const { userId } = data;

        try {
          // Delete profile first
          const { error: profileDeleteErr } = await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
          if (profileDeleteErr) {
            console.log("❌ Profile deletion failed:", profileDeleteErr.message);
            throw profileDeleteErr;
          }

          // Delete auth user
          const { error: userDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId!);
          if (userDeleteErr) {
            console.log("❌ Auth user deletion failed:", userDeleteErr.message);
            throw userDeleteErr;
          }

          console.log("✅ User deleted successfully");
          return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        } catch (deleteError: any) {
          console.log("❌ User deletion process failed:", deleteError.message);
          return new Response(JSON.stringify({ 
            success: false, 
            error: `User deletion failed: ${deleteError.message}`
          }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
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
      hint: err?.hint,
      stack: err?.stack
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