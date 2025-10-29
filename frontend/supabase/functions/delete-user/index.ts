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
    console.log('📥 Reading request body...');
    const { user_id, admin_email } = await req.json();

    if (!user_id || !admin_email) {
      console.error('❌ Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing user_id or admin_email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`👤 Admin requesting deletion: ${admin_email}`);
    console.log(`🗑️ Target user ID: ${user_id}`);

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check for demo admin credentials first
    console.log('🔐 Verifying admin permissions...');
    let adminRole = null;
    let adminUserId = null;

    // Demo credentials check
    const demoCredentials: Record<string, string> = {
      'admin@epacific.com': 'admin',
      'manager@epacific.com': 'manager'
    };

    if (demoCredentials[admin_email as keyof typeof demoCredentials]) {
      console.log('✅ Demo admin credentials detected');
      adminRole = demoCredentials[admin_email as keyof typeof demoCredentials];
      // For demo accounts, we don't need a specific user_id for permission checks
      adminUserId = 'demo-admin';
    } else {
      // Regular database lookup for non-demo accounts
      // First get the user_id from profiles
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', admin_email)
        .single();

      if (adminError || !adminProfile) {
        console.error('❌ Admin profile not found:', adminError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Admin profile not found' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Now get the role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', adminProfile.user_id)
        .single();

      if (roleError || !roleData) {
        console.error('❌ Admin role not found:', roleError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Admin role not found' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      adminRole = roleData.role;
      adminUserId = adminProfile.user_id;
    }

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

    // Get target user profile (use maybeSingle to handle missing profiles)
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

    // Prevent self-deletion (skip for demo accounts)
    if (adminUserId !== 'demo-admin' && adminUserId === user_id) {
      console.error('❌ Attempted self-deletion');
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Manager role restrictions - managers can delete users and other managers, but not admins
    if (adminRole === 'manager') {
      // Get target user's role from user_roles table
      const { data: targetRole, error: targetRoleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .single();

      if (targetRole && targetRole.role === 'admin') {
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

    // Delete related data in order (payments -> reports -> profile -> auth user)
    
    // 1. Delete payments (silently continue if none exist)
    console.log('💳 Deleting user payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', user_id);

    if (paymentsError) {
      console.log('⚠️ Warning: Could not delete payments:', paymentsError.message);
      // Continue deletion process even if payments deletion fails
    }

    // 2. Delete reports (silently continue if none exist)
    console.log('📊 Deleting user reports...');
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', user_id);

    if (reportsError) {
      console.log('⚠️ Warning: Could not delete reports:', reportsError.message);
      // Continue deletion process even if reports deletion fails
    }

    // 3. Delete invite tokens (cleanup any pending invites)
    console.log('🎫 Deleting invite tokens...');
    const { error: tokensError } = await supabase
      .from('invite_tokens')
      .delete()
      .eq('email', targetProfile.email);

    if (tokensError) {
      console.log('⚠️ Warning: Could not delete invite tokens:', tokensError.message);
    }

    // 4. Delete user role
    console.log('🔐 Deleting user role...');
    const { error: roleDeleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);

    if (roleDeleteError) {
      console.log('⚠️ Warning: Could not delete user role:', roleDeleteError.message);
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
    const { error: authError } = await supabase.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error('❌ Error deleting auth user:', authError);
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