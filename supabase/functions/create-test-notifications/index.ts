import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating test notifications for existing approved items...');

    // Get approved reports that don't have notifications yet
    const { data: approvedReports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        *,
        profiles:user_id (
          full_name
        )
      `)
      .eq('status', 'approved');

    if (reportsError) throw reportsError;

    // Get approved payments that don't have notifications yet  
    const { data: approvedPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        profiles:user_id (
          full_name
        )
      `)
      .eq('status', 'approved');

    if (paymentsError) throw paymentsError;

    console.log(`Found ${approvedReports?.length || 0} approved reports and ${approvedPayments?.length || 0} approved payments`);

    const notificationsCreated = [];

    // Create notifications for approved reports
    if (approvedReports) {
      for (const report of approvedReports) {
        try {
          const { error } = await supabase.rpc('create_notification', {
            notification_type: 'report_uploaded',
            notification_title: 'Report Approved',
            notification_message: `Your report "${report.title}" has been approved successfully.`,
            notification_user_id: report.user_id,
            notification_target_role: 'user'
          });

          if (error) {
            console.error('Error creating report notification:', error);
          } else {
            notificationsCreated.push(`Report approval notification for ${report.title}`);
          }
        } catch (err) {
          console.error('Error creating report notification:', err);
        }
      }
    }

    // Create notifications for approved payments
    if (approvedPayments) {
      for (const payment of approvedPayments) {
        try {
          const { error } = await supabase.rpc('create_notification', {
            notification_type: 'payment_submitted',
            notification_title: 'Payment Approved',
            notification_message: `Your payment of ₹${payment.amount.toLocaleString()} has been approved successfully.`,
            notification_user_id: payment.user_id,
            notification_target_role: 'user'
          });

          if (error) {
            console.error('Error creating payment notification:', error);
          } else {
            notificationsCreated.push(`Payment approval notification for ₹${payment.amount}`);
          }
        } catch (err) {
          console.error('Error creating payment notification:', err);
        }
      }
    }

    console.log('Notifications created:', notificationsCreated);

    return new Response(JSON.stringify({
      success: true,
      message: `Created ${notificationsCreated.length} test notifications`,
      notifications: notificationsCreated
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating test notifications:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});