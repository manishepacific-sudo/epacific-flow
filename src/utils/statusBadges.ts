export type ReportStatus = 'pending_approval' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};

export const REPORT_BADGE_VARIANT: Record<ReportStatus, 'default' | 'destructive' | 'secondary'> = {
  approved: 'default',
  rejected: 'destructive',
  pending_approval: 'secondary',
};

export const REPORT_BADGE_CLASS: Record<ReportStatus, string> = {
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export const PAYMENT_BADGE_CLASS: Record<PaymentStatus, string> = {
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export function getReportStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getPaymentStatusLabel(status: string): string {
  return STATUS_LABELS[status] || (status.charAt(0).toUpperCase() + status.slice(1));
}

export function getReportBadgeProps(status: string): { variant: 'default' | 'destructive' | 'secondary'; className: string } {
  // Normalize legacy/new status values
  const normalized: ReportStatus = (status === 'pending' ? 'pending_approval' : status) as ReportStatus;
  const variant = REPORT_BADGE_VARIANT[normalized] || 'secondary';
  const className = REPORT_BADGE_CLASS[normalized] || REPORT_BADGE_CLASS['pending_approval'];
  return { variant, className };
}

export function getPaymentBadgeClass(status: PaymentStatus): string {
  return PAYMENT_BADGE_CLASS[status];
}







