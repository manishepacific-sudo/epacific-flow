import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 Delete-user handler started');

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized: No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('❌ Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Authenticated user:', user.id);

    // Parse request body
    const { user_id } = await req.json();

    if (!user_id) {
      console.error('❌ Missing user_id');
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🗑️ Target user ID: ${user_id}`);

    // Get requesting user's role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_user_role', { user_id_param: user.id });

    if (roleError || !roleData) {
      console.log('❌ Failed to get user role:', roleError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Could not verify user role" }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const adminRole = roleData;
    console.log('✅ User role:', adminRole);

    if (!['admin', 'manager'].includes(adminRole)) {
      console.error('❌ Insufficient permissions:', adminRole);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prevent self-deletion
    if (user.id === user_id) {
      console.error('❌ Attempted self-deletion');
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get target user profile
    console.log('👥 Fetching target user profile...');
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (targetError) {
      console.error('❌ Error fetching target profile:', targetError);
      return new Response(
        JSON.stringify({ error: 'Error fetching user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!targetProfile) {
      console.log('⚠️ No profile found, but attempting to delete auth user anyway...');
      // Still try to delete from auth.users even if no profile exists
      const { error: authError } = await supabase.auth.admin.deleteUser(user_id);
      
      if (authError) {
        console.error('❌ Error deleting auth user (no profile):', authError);
        return new Response(
          JSON.stringify({ error: 'User not found or already deleted' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('✅ Auth user deleted (no profile existed)');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User deleted from authentication system (no profile found)' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Manager role restrictions - managers can't delete admins
    if (adminRole === 'manager') {
      // Get target user's role
      const { data: targetRoleData } = await supabase
        .rpc('get_user_role', { user_id_param: user_id });
      
      if (targetRoleData === 'admin') {
        console.error('❌ Manager cannot delete admin accounts');
        return new Response(
          JSON.stringify({ error: 'Managers cannot delete admin accounts' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log('🗄️ Starting cascade deletion...');

    // Delete related data in order
    
    // 1. Delete payments
    console.log('💳 Deleting user payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', user_id);

    if (paymentsError) {
      console.log('⚠️ Warning: Could not delete payments:', paymentsError.message);
    }

    // 2. Delete reports
    console.log('📊 Deleting user reports...');
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', user_id);

    if (reportsError) {
      console.log('⚠️ Warning: Could not delete reports:', reportsError.message);
    }

    // 3. Delete invite tokens
    console.log('🎫 Deleting invite tokens...');
    const { error: tokensError } = await supabase
      .from('invite_tokens')
      .delete()
      .eq('email', targetProfile.email);

    if (tokensError) {
      console.log('⚠️ Warning: Could not delete invite tokens:', tokensError.message);
    }

    // 4. Delete user roles
    console.log('👔 Deleting user roles...');
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (rolesError) {
      console.log('⚠️ Warning: Could not delete user roles:', rolesError.message);
    }

    // 5. Delete profile
    console.log('👤 Deleting user profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', user_id);

    if (profileError) {
      console.error('❌ Error deleting profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 6. Delete from auth.users
    console.log('🔐 Deleting from auth.users...');
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('❌ Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from authentication system' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User deleted successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetProfile.full_name} (${targetProfile.email}) has been successfully deleted` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
