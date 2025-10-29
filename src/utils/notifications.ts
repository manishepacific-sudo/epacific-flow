import { supabase } from '@/integrations/supabase/client';
import { APP_BASE_URL, LOGO_URL } from '@/config/constants';

interface CreateNotificationParams {
  type: 'report_uploaded' | 'payment_submitted' | 'report_rejected' | 'payment_rejected' | 'report_approved' | 'payment_approved';
  title: string;
  message: string;
  user_id: string;
  target_role: 'admin' | 'manager' | 'user';
  linkPath?: string; // Optional deep link path to navigate on click
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Optionally append a hidden link marker to the message
    const messageWithLink = params.linkPath ? `${params.message}\n\n[link:${params.linkPath}]` : params.message;

    // Use rpc to bypass TypeScript typing issues with new table
    const { error } = await supabase.rpc('create_notification', {
      notification_type: params.type,
      notification_title: params.title,
      notification_message: messageWithLink,
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
export async function notifyReportUploaded(userId: string, reportTitle: string, reportId?: string): Promise<void> {
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
      target_role: 'manager',
      linkPath: reportId ? `/report/${reportId}` : undefined,
    });
  } catch (error) {
    console.error('Error in notifyReportUploaded:', error);
  }
}

export async function notifyPaymentSubmitted(userId: string, amount: number, linkPath: string = '/payments'): Promise<void> {
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
      target_role: 'manager',
      linkPath
    });
  } catch (error) {
    console.error('Error in notifyPaymentSubmitted:', error);
  }
}

export async function notifyReportRejected(userId: string, reportTitle: string, reason: string, reportId?: string): Promise<void> {
  await createNotification({
    type: 'report_rejected',
    title: 'Report Rejected',
    message: `Your report "${reportTitle}" has been rejected. Reason: ${reason}`,
    user_id: userId,
    target_role: 'user',
    linkPath: reportId ? `/report/${reportId}` : undefined,
  });
  await sendEmailForUser(userId, {
    type: 'report',
    subject: 'Report Rejected — Please Re-upload',
    html: `Hello,<br><br>Your report "${reportTitle}" was rejected. Please review the feedback and re-upload your report.<br><a href='${APP_BASE_URL}/submit-report'>Re-upload Report</a><br><br>– Epacific Technologies`,
  });
}

export async function notifyPaymentRejected(userId: string, amount: number, reason: string, linkPath: string = '/payments'): Promise<void> {
  await createNotification({
    type: 'payment_rejected',
    title: 'Payment Rejected',
    message: `Your payment of ₹${amount.toLocaleString()} has been rejected. Reason: ${reason}`,
    user_id: userId,
    target_role: 'user',
    linkPath
  });
  await sendEmailForUser(userId, {
    type: 'payment',
    subject: 'Payment Rejected — Please Resubmit',
    html: `Hello,<br><br>Your payment proof for ₹${amount.toLocaleString()} was rejected.<br>Please resubmit your payment proof here:<br><a href='${APP_BASE_URL}/submit-payment'>Re-upload Payment Proof</a><br><br>– Epacific Technologies`,
  });
}

export async function notifyReportApproved(userId: string, reportTitle: string, reportId?: string): Promise<void> {
  await createNotification({
    type: 'report_approved',
    title: 'Report Approved',
    message: `Your report "${reportTitle}" has been approved successfully.`,
    user_id: userId,
    target_role: 'user',
    linkPath: reportId ? `/report/${reportId}` : undefined,
  });
  await sendEmailForUser(userId, {
    type: 'report',
    subject: 'Your Report Has Been Approved',
    html: `Hello,<br><br>Your report has been approved successfully.<br>You can view your approved report here:<br><a href='${APP_BASE_URL}/reports'>View Report</a><br><br>– Epacific Technologies`,
  });
}

export async function notifyPaymentApproved(userId: string, amount: number, linkPath: string = '/payments'): Promise<void> {
  await createNotification({
    type: 'payment_approved',
    title: 'Payment Approved',
    message: `Your payment of ₹${amount.toLocaleString()} has been approved successfully.`,
    user_id: userId,
    target_role: 'user',
    linkPath
  });
  await sendEmailForUser(userId, {
    type: 'payment',
    subject: 'Payment Approved — Thank You',
    html: `Hello,<br><br>Your payment of ₹${amount.toLocaleString()} has been approved successfully.<br>You can view your payment history here:<br><a href='${APP_BASE_URL}/payments'>View Payments</a><br><br>– Epacific Technologies`,
  });
}

// Email helper: looks up user email and calls edge function
async function sendEmailForUser(userId: string, params: { type: 'report' | 'payment' | 'attendance'; subject: string; html: string }) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    const to = profile?.email;
    if (!to) return;

    // read email enabled setting (default true)
    let emailEnabled = true;
    try {
      const { data } = await supabase.functions.invoke('manage-settings', {
        body: { action: 'get', payload: { key: 'integrations.notifications.preferences' } }
      });
      const value = data?.data?.value;
      emailEnabled = value?.emailEnabled !== false;
    } catch {}

    await supabase.functions.invoke('send-email-notification', {
      body: {
        to,
        subject: params.subject,
        html: brandedEmailHtml(profile?.full_name || 'User', params.html),
        user_id: userId,
        type: params.type,
        enabled: emailEnabled,
      }
    });
  } catch (e) {
    console.error('sendEmailForUser error:', e);
  }
}

function brandedEmailHtml(name: string, innerHtml: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f7f9fc;padding:24px;color:#0A2E5C;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6eef7;">
      <div style="background:#0A2E5C;color:#FFFFFF;padding:16px 20px;display:flex;align-items:center;gap:12px;">
        <img src="${LOGO_URL}" alt="Epacific" style="height:28px;"/>
        <div style="font-weight:600;">Epacific Technologies</div>
      </div>
      <div style="padding:20px 24px;line-height:1.6;">
        <p style="margin:0 0 12px 0;">Hello ${name},</p>
        <div>${innerHtml}</div>
      </div>
      <div style="padding:14px 24px;background:#f1f6fd;color:#0A2E5C;font-size:12px;">
        This is an automated message. Please do not reply.
      </div>
    </div>
  </div>`;
}