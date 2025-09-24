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
    const { action, data, admin_email }: ManageUserRequest & { admin_email?: string } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // Service role required
    );

    // For create action, validate authorization
    if (action === "create") {
      if (!admin_email) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Email required" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check user role from database
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('email', admin_email)
        .single();

      if (profileError || !userProfile) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: User not found" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Validate role permissions
      const requestingUserRole = userProfile.role;
      const { role: targetRole } = data;
      
      if (requestingUserRole === 'admin') {
        // Admins can create any role
        console.log('✅ Admin creating user with role:', targetRole);
      } else if (requestingUserRole === 'manager') {
        // Managers can only create users and managers
        if (!['user', 'manager'].includes(targetRole || '')) {
          return new Response(
            JSON.stringify({ success: false, error: "Unauthorized: Managers can only create users and managers" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        console.log('✅ Manager creating user with role:', targetRole);
      } else {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: Only admins and managers can create users" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    switch (action) {
      case "create": {
        console.log('🔧 Starting user creation process...');
        const { email, role, full_name, mobile_number, station_id, center_address } = data;

        if (!email || !role) {
          console.log('❌ Missing email or role');
          throw new Error("Email and role are required");
        }

        console.log('📧 Creating user with email:', email, 'role:', role);

        // Check if user already exists and delete if found
        console.log('🔍 Checking for existing user...');
        const { data: existingProfiles, error: checkError } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .eq("email", email);

        if (checkError) {
          console.log('❌ Error checking existing profiles:', checkError);
          throw checkError;
        }

        if (existingProfiles && existingProfiles.length > 0) {
          console.log('🗑️ Deleting existing user...');
          const userId = existingProfiles[0].user_id;
          // Delete profile first
          await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
          // Delete auth user
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log('✅ Existing user deleted');
        }

        // Create user directly with password (for admin accounts)
        const defaultPassword = email === 'admin@myapp.com' ? 'SecurePassword123!' : 'tempPassword123';
        
        console.log('👤 Creating auth user...');
        const { data: userData, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: defaultPassword,
            email_confirm: true, // Skip email confirmation
            user_metadata: {
              full_name: full_name || email.split("@")[0],
              role,
              mobile_number: mobile_number || "",
              station_id: station_id || "",
              center_address: center_address || "",
            },
          });

        if (createError) {
          console.log('❌ Auth user creation failed:', createError);
          throw createError;
        }
        
        console.log('✅ Auth user created successfully, ID:', userData.user.id);

        // Create profile
        console.log('📝 Creating profile...');
        const { error: profileError } = await supabaseAdmin.from("profiles").insert({
          user_id: userData.user.id,
          email,
          full_name: full_name || email.split("@")[0],
          role,
          mobile_number: mobile_number || "",
          station_id: station_id || "",
          center_address: center_address || "",
          is_demo: false,
          password_set: true, // Password is already set
        });

        if (profileError) {
          console.log('❌ Profile creation failed:', profileError);
          throw profileError;
        }
        
        console.log('✅ Profile created successfully');

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: userData.user.id,
              email,
              role,
            },
            password: defaultPassword, // Return the password for convenience
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
