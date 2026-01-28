import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { format, isValid } from 'date-fns';
import type { DBReport } from '@/types';
import { Label } from '@/components/ui/label';

type ProfileLike = {
  full_name?: string | null;
  email?: string | null;
};

interface ReportActivityTimelineProps {
  report: DBReport;
  submitterProfile?: ProfileLike | null;
  approverProfile?: ProfileLike | null;
  rejectorProfile?: ProfileLike | null;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const dateObj = new Date(value);
  if (!isValid(dateObj)) return '—';
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

export function ReportActivityTimeline({
  report,
  submitterProfile,
  approverProfile,
  rejectorProfile,
}: ReportActivityTimelineProps) {
  // When both approved_at and rejected_at exist (edge case), display only the
  // most recent event to avoid overlapping/conflicting timeline states.
  const hasApproved = !!report?.approved_at;
  const hasRejected = !!report?.rejected_at;

  let showApproved = false;
  let showRejected = false;

  if (hasApproved && hasRejected) {
    const approvedAt = new Date(report.approved_at as string);
    const rejectedAt = new Date(report.rejected_at as string);
    if (isValid(approvedAt) && isValid(rejectedAt)) {
      if (approvedAt >= rejectedAt) {
        showApproved = true;
      } else {
        showRejected = true;
      }
    } else if (hasApproved) {
      showApproved = true;
    } else if (hasRejected) {
      showRejected = true;
    }
  } else {
    showApproved = report?.status === 'approved' && hasApproved;
    showRejected = report?.status === 'rejected' && hasRejected;
  }

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
      </div>

      {/*
        Layout refactor: fixed first column for icons and a centered vertical
        connector line that is independent of icon size.
        - First column width: 40px
        - Connector line: centered in that column
      */}
      <div className="relative grid grid-cols-[40px_1fr] gap-x-4">
        {/* Column-wide vertical connector anchored to the first (40px) column */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[40px]">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-muted" />
        </div>

        {/* Submission Event */}
        <div className="col-span-2 grid grid-cols-subgrid items-start gap-x-4 py-3 first:pt-0">
          <div className="relative z-[1] col-[1] mt-0.5 flex items-center justify-center">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="col-[2]">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">Report Submitted</div>
              <div className="text-xs text-muted-foreground">{formatTimestamp(report?.created_at)}</div>
            </div>
            <div className="mt-1 text-sm text-foreground">
              {submitterProfile?.full_name || 'Unknown User'}
            </div>
            {submitterProfile?.email ? (
              <div className="text-xs text-muted-foreground">{submitterProfile.email}</div>
            ) : null}
          </div>
        </div>

        {/* Approval Event */}
        {showApproved ? (
          <div className="col-span-2 grid grid-cols-subgrid items-start gap-x-4 py-3">
            <div className="relative z-[1] col-[1] mt-0.5 flex items-center justify-center">
              <div className="p-2 rounded-full bg-green-100 text-green-600">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="col-[2]">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">Report Approved</div>
                <div className="text-xs text-muted-foreground">{formatTimestamp(report?.approved_at)}</div>
              </div>
              <div className="mt-1 text-sm text-foreground">
                {approverProfile?.full_name || 'Manager/Admin'}
              </div>
            </div>
          </div>
        ) : null}

        {/* Rejection Event */}
        {showRejected ? (
          <div className="col-span-2 grid grid-cols-subgrid items-start gap-x-4 py-3">
            <div className="relative z-[1] col-[1] mt-0.5 flex items-center justify-center">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <XCircle className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="col-[2]">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">Report Rejected</div>
                <div className="text-xs text-muted-foreground">{formatTimestamp(report?.rejected_at)}</div>
              </div>
              <div className="mt-1 text-sm text-foreground">
                {rejectorProfile?.full_name || 'Manager/Admin'}
              </div>
              {report?.rejection_message ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {report.rejection_message}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Optional labels for clarity on IDs if needed in future
        <div className="sr-only">
          <Label htmlFor="timeline">Report activity timeline</Label>
        </div>
        */}
      </div>
    </GlassCard>
  );
}

export default ReportActivityTimeline;


