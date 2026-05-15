import { supabase } from '@/integrations/supabase/client';

interface CreateNotificationParams {
  type: 'report_uploaded' | 'payment_submitted' | 'report_rejected' | 'payment_rejected';
  title: string;
  message: string;
  user_id: string;
  target_role: 'admin' | 'manager' | 'user';
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Use rpc to bypass TypeScript typing issues with new table
    const { error } = await supabase.rpc('create_notification', {
      notification_type: params.type,
      notification_title: params.title,
      notification_message: params.message,
      notification_user_id: params.user_id,
      notification_target_role: params.target_role
    });

    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Helper functions for common notification scenarios
export async function notifyReportUploaded(userId: string, reportTitle: string): Promise<void> {
  try {
    // Get user profile to include name in notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const userName = profile?.full_name || 'A user';
    
    await createNotification({
      type: 'report_uploaded',
      title: 'New Report Uploaded',
      message: `${userName} has uploaded a new report "${reportTitle}" and it's pending approval.`,
      user_id: userId,
      target_role: 'manager'
    });
  } catch (error) {
    console.error('Error in notifyReportUploaded:', error);
  }
}

export async function notifyPaymentSubmitted(userId: string, amount: number): Promise<void> {
  try {
    // Get user profile to include name in notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const userName = profile?.full_name || 'A user';
    
    await createNotification({
      type: 'payment_submitted',
      title: 'New Payment Submitted',
      message: `${userName} has submitted a payment of ₹${amount.toLocaleString()} and it's pending review.`,
      user_id: userId,
      target_role: 'manager'
    });
  } catch (error) {
    console.error('Error in notifyPaymentSubmitted:', error);
  }
}

export async function notifyReportRejected(userId: string, reportTitle: string, reason: string): Promise<void> {
  await createNotification({
    type: 'report_rejected',
    title: 'Report Rejected',
    message: `Your report "${reportTitle}" has been rejected. Reason: ${reason}`,
    user_id: userId,
    target_role: 'user'
  });
}

export async function notifyPaymentRejected(userId: string, amount: number, reason: string): Promise<void> {
  await createNotification({
    type: 'payment_rejected',
    title: 'Payment Rejected',
    message: `Your payment of ₹${amount.toLocaleString()} has been rejected. Reason: ${reason}`,
    user_id: userId,
    target_role: 'user'
  });
}

export async function notifyReportApproved(userId: string, reportTitle: string): Promise<void> {
  await createNotification({
    type: 'report_uploaded', // Using existing type since we don't have report_approved
    title: 'Report Approved',
    message: `Your report "${reportTitle}" has been approved successfully.`,
    user_id: userId,
    target_role: 'user'
  });
}

export async function notifyPaymentApproved(userId: string, amount: number): Promise<void> {
  await createNotification({
    type: 'payment_submitted', // Using existing type since we don't have payment_approved
    title: 'Payment Approved',
    message: `Your payment of ₹${amount.toLocaleString()} has been approved successfully.`,
    user_id: userId,
    target_role: 'user'
  });
}