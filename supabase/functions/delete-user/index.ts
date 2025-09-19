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

    // Verify admin/manager permissions
    console.log('🔐 Verifying admin permissions...');
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role, user_id')
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

    if (!['admin', 'manager'].includes(adminProfile.role)) {
      console.error('❌ Insufficient permissions:', adminProfile.role);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Insufficient permissions' }),
        { 
          status: 403, 
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
      .single();

    if (targetError || !targetProfile) {
      console.error('❌ Target user not found:', targetError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prevent self-deletion
    if (adminProfile.user_id === user_id) {
      console.error('❌ Attempted self-deletion');
      return new Response(
        JSON.stringify({ error: 'Cannot delete your own account' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Manager role restrictions
    if (adminProfile.role === 'manager' && targetProfile.role !== 'user') {
      console.error('❌ Manager cannot delete admin/manager accounts');
      return new Response(
        JSON.stringify({ error: 'Managers can only delete regular user accounts' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🗄️ Starting cascade deletion...');

    // Delete related data in order (payments -> reports -> profile -> auth user)
    
    // 1. Delete payments
    console.log('💳 Deleting user payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', user_id);

    if (paymentsError) {
      console.error('❌ Error deleting payments:', paymentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user payments' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Delete reports
    console.log('📊 Deleting user reports...');
    const { error: reportsError } = await supabase
      .from('reports')
      .delete()
      .eq('user_id', user_id);

    if (reportsError) {
      console.error('❌ Error deleting reports:', reportsError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user reports' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Delete profile
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

    // 4. Delete from auth.users
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