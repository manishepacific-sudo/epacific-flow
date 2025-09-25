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
  await createNotification({
    type: 'report_uploaded',
    title: 'New Report Uploaded',
    message: `A new report "${reportTitle}" has been uploaded and is pending approval.`,
    user_id: userId,
    target_role: 'manager'
  });
}

export async function notifyPaymentSubmitted(userId: string, amount: number): Promise<void> {
  await createNotification({
    type: 'payment_submitted',
    title: 'New Payment Submitted',
    message: `A payment of ₹${amount.toLocaleString()} has been submitted and is pending review.`,
    user_id: userId,
    target_role: 'manager'
  });
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