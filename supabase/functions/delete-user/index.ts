import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminRole = "admin" | "manager";

const demoCredentials: Record<string, AdminRole> = {
  "admin@epacific.com": "admin",
  "manager@epacific.com": "manager",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function resolveAdminContext(supabase: any, adminEmail: string) {
  const normalizedEmail = (adminEmail ?? "").trim();
  const lowerEmail = normalizedEmail.toLowerCase();

  if (demoCredentials[normalizedEmail as keyof typeof demoCredentials]) {
    return {
      role: demoCredentials[normalizedEmail as keyof typeof demoCredentials],
      userId: "demo-admin",
      isDemo: true,
    } as const;
  }

  let adminUserId: string | null = null;
  let adminRole: AdminRole | null = null;
  let authUser: any = null;

  // First try to find the profile by exact email match
  const { data: adminProfile, error: adminProfileError } = await supabase
    .from("profiles")
    .select("user_id, email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (adminProfileError) {
    console.error("❌ Error fetching admin profile:", adminProfileError);
    return { error: "Database error while verifying admin" } as const;
  }

  if (adminProfile?.user_id) {
    adminUserId = adminProfile.user_id;
  } else {
    // Fallback: search in auth users list (case-insensitive email check)
    let page = 1;
    const perPage = 1000;
    let found = false;

    while (!found) {
      const { data: pageData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (listError) {
        console.error("❌ Failed to list users for admin lookup:", listError);
        return { error: "Unauthorized: Admin profile not found" } as const;
      }

      authUser = pageData.users.find((u: any) => (u.email ?? "").toLowerCase() === lowerEmail);
      if (authUser) {
        found = true;
        break;
      }

      if (!pageData.users || pageData.users.length < perPage) {
        break; // no more pages
      }
      page += 1;
    }

    if (!authUser) {
      console.error("❌ Admin auth user not found for email", normalizedEmail);
      return { error: "Unauthorized: Admin profile not found" } as const;
    }

    adminUserId = authUser.id;
  }

  // Fetch role from user_roles table
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", adminUserId)
    .maybeSingle();

  if (roleError) {
    console.error("❌ Failed to fetch admin role:", roleError);
    return { error: "Database error while verifying admin" } as const;
  }

  adminRole = (roleData?.role as AdminRole | undefined) ?? (authUser?.user_metadata?.role as AdminRole | undefined) ?? null;

  if (!adminRole || !["admin", "manager"].includes(adminRole)) {
    console.error("❌ Insufficient permissions for admin", normalizedEmail, "role", adminRole);
    return { error: "Unauthorized: Insufficient permissions" } as const;
  }

  return { role: adminRole as AdminRole, userId: adminUserId!, isDemo: false } as const;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id: targetUserId, admin_email: adminEmailRaw } = await req.json();
    const adminEmail = (adminEmailRaw ?? "").trim();

    if (!targetUserId || !adminEmail) {
      return jsonResponse(400, { error: "Missing user_id or admin_email" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const adminContext = await resolveAdminContext(supabase, adminEmail);
    if ("error" in adminContext) {
      return jsonResponse(403, { error: adminContext.error });
    }

    const { role: adminRole, userId: adminUserId, isDemo } = adminContext;

    if (!isDemo && adminUserId === targetUserId) {
      return jsonResponse(400, { error: "Cannot delete your own account" });
    }

    let targetRole: string | null = null;
    const { data: targetRoleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();
    targetRole = targetRoleData?.role ?? null;

    if (adminRole === "manager" && targetRole === "admin") {
      return jsonResponse(403, { error: "Managers cannot delete admin accounts" });
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetProfileError) {
      console.error("❌ Failed to fetch target profile:", targetProfileError);
      return jsonResponse(500, { error: "Failed to fetch user profile" });
    }

    // Cascade cleanup
    await supabase.from("payments").delete().eq("user_id", targetUserId);
    await supabase.from("reports").delete().eq("user_id", targetUserId);
    await supabase.from("attendance").delete().eq("user_id", targetUserId);
    await supabase.from("invite_tokens").delete().eq("user_data->>user_id", targetUserId);
    await supabase.from("invite_tokens").delete().eq("email", targetProfile?.email ?? "");
    await supabase.from("user_roles").delete().eq("user_id", targetUserId);
    await supabase.from("profiles").delete().eq("user_id", targetUserId);

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      console.error("❌ Failed to delete auth user:", authDeleteError);
      return jsonResponse(500, { error: "Failed to delete user from authentication system" });
    }

    return jsonResponse(200, {
      success: true,
      message: `User ${targetProfile?.full_name ?? targetUserId} has been deleted`,
    });
  } catch (error) {
    console.error("❌ Unexpected error in delete-user function:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});

