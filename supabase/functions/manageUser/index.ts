import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: 'create' | 'setPassword' | 'delete';
  data: {
    email?: string;
    role?: 'admin' | 'manager' | 'user';
    full_name?: string;
    mobile_number?: string;
    station_id?: string;
    center_address?: string;
    userId?: string;
    password?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data }: ManageUserRequest = await req.json();
    
    console.log(`Managing user with action: ${action}`, data);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (action) {
      case 'create': {
        const { email, role, full_name, mobile_number, station_id, center_address } = data;
        
        if (!email || !role) {
          throw new Error('Email and role are required for user creation');
        }

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers.users.some(user => user.email === email);
        
        if (userExists) {
          throw new Error('User with this email already exists');
        }

        // Create invite redirect URL - use production URL format
        const redirectUrl = `https://nimxzvhzxsfkfpnbhphm.supabase.co/auth/v1/verify?token={token}&type=invite&redirect_to=${encodeURIComponent(`${Deno.env.get('SUPABASE_URL')?.replace('/supabase', '')}/set-password`)}`;

        // Invite user via Supabase Auth with native email
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          email,
          {
            data: {
              full_name: full_name || email.split('@')[0],
              role,
              mobile_number: mobile_number || '',
              station_id: station_id || '',
              center_address: center_address || ''
            }
          }
        );

        if (inviteError) {
          console.error("Invite error:", inviteError);
          throw inviteError;
        }

        // Create profile with password_set = false
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: inviteData.user.id,
            email: email,
            full_name: full_name || email.split('@')[0],
            role: role,
            mobile_number: mobile_number || '',
            station_id: station_id || '',
            center_address: center_address || '',
            is_demo: false,
            password_set: false
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          throw profileError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          user: {
            id: inviteData.user.id,
            email: email,
            role: role,
            full_name: full_name
          }
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      case 'setPassword': {
        const { userId, password } = data;
        
        if (!userId || !password) {
          throw new Error('User ID and password are required');
        }

        // Update user password
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        );

        if (updateError) {
          console.error("Password update error:", updateError);
          throw updateError;
        }

        // Update profile to mark password as set
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ password_set: true })
          .eq('user_id', userId);

        if (profileError) {
          console.error("Profile update error:", profileError);
          throw profileError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          user: updateData.user
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      case 'delete': {
        const { userId } = data;
        
        if (!userId) {
          throw new Error('User ID is required for deletion');
        }

        // Delete user from Supabase Auth (will cascade delete profile due to foreign key)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error("User deletion error:", deleteError);
          throw deleteError;
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'User deleted successfully'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

  } catch (error: any) {
    console.error("Error in manageUser function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);