export const NORMALIZE_APPROVAL_STATE = true;

type Action = 'approve' | 'reject';

interface BaseFields {
  manager_notes?: string | null;
  rejection_message?: string | null;
  user_id?: string | null; // acting manager user id
}

// Build a normalized update payload for reports table
export function buildReportApprovalUpdate(action: Action, fields: BaseFields) {
  const now = new Date().toISOString();
  const isApprove = action === 'approve';

  const updateData: Record<string, any> = {
    status: isApprove ? 'approved' : 'rejected',
    updated_at: now,
  };

  if (isApprove) {
    updateData.manager_notes = fields.manager_notes ?? null;
    // Clear rejection fields when approving
    if (NORMALIZE_APPROVAL_STATE) {
      updateData.rejection_message = null;
    }
  } else {
    updateData.rejection_message = fields.rejection_message ?? null;
    updateData.manager_notes = fields.manager_notes ?? null;
  }

  return updateData;
}







