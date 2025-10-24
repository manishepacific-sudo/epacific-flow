-- Migration: Seed new system_settings for attendance, reports, notifications, app_config and payments enhancements
-- Purpose: Insert default settings for new categories used by the Admin Settings UI. Idempotent with ON CONFLICT DO NOTHING
BEGIN;

INSERT INTO public.system_settings (key, category, value, description)
VALUES
  ('attendance.gps.enabled', 'attendance', '{"enabled": true}'::jsonb, 'Enable GPS tracking for attendance'),
  ('attendance.gps.radius', 'attendance', '{"radius": 100}'::jsonb, 'Allowed location radius in meters'),
  ('attendance.gps.fake_detection', 'attendance', '{"fake_detection": true}'::jsonb, 'Detect fake GPS apps'),
  ('attendance.work_hours.start', 'attendance', '{"start": "09:00"}'::jsonb, 'Work day start time'),
  ('attendance.work_hours.end', 'attendance', '{"end": "18:00"}'::jsonb, 'Work day end time'),
  ('attendance.manual_checkin.managers', 'attendance', '{"managers": true}'::jsonb, 'Allow manual check-in for managers'),

  ('reports.submission.deadline', 'reports', '{"deadline": "last_day_of_month"}'::jsonb, 'Report submission deadline (default last day of month)'),
  ('reports.submission.type', 'reports', '{"type": "monthly"}'::jsonb, 'Report submission frequency: daily/weekly/monthly'),
  ('reports.rejection.comments_enabled', 'reports', '{"comments_enabled": true}'::jsonb, 'Allow rejection comments on reports'),
  ('reports.approval.manager_required', 'reports', '{"manager_required": true}'::jsonb, 'Require manager approval for reports'),
  ('reports.reviewers.assigned', 'reports', '{"assigned": []}'::jsonb, 'List of manager user IDs assigned as reviewers'),

  ('notifications.email.enabled', 'notifications', '{"enabled": true}'::jsonb, 'Enable email notifications'),
  ('notifications.inapp.enabled', 'notifications', '{"enabled": true}'::jsonb, 'Enable in-app notifications'),
  ('notifications.events.report_submitted', 'notifications', '{"report_submitted": true}'::jsonb, 'Notify admin when a report is submitted'),
  ('notifications.events.payment_rejected', 'notifications', '{"payment_rejected": true}'::jsonb, 'Notify user when payment is rejected'),
  ('notifications.events.payment_approved', 'notifications', '{"payment_approved": true}'::jsonb, 'Notify user when payment is approved'),

  ('app_config.company.name', 'app_config', '{"name": "Epacific"}'::jsonb, 'Company display name'),
  ('app_config.company.logo_url', 'app_config', '{"logo_url": ""}'::jsonb, 'Company logo URL'),
  ('app_config.theme.primary_color', 'app_config', '{"primary_color": "#3b82f6"}'::jsonb, 'Primary theme color hex'),
  ('app_config.theme.secondary_color', 'app_config', '{"secondary_color": "#8b5cf6"}'::jsonb, 'Secondary theme color hex'),
  ('app_config.timezone', 'app_config', '{"timezone": "Asia/Kolkata"}'::jsonb, 'Application timezone'),
  ('app_config.maintenance.enabled', 'app_config', '{"enabled": false}'::jsonb, 'Maintenance mode toggle'),
  ('app_config.email_templates.invite', 'app_config', '{"invite": ""}'::jsonb, 'Invite email template'),
  ('app_config.email_templates.rejection', 'app_config', '{"rejection": ""}'::jsonb, 'Rejection email template'),
  ('app_config.email_templates.approval', 'app_config', '{"approval": ""}'::jsonb, 'Approval email template'),

  ('payments.module.enabled', 'payments', '{"enabled": true}'::jsonb, 'Enable payments module'),
  ('payments.default.amount', 'payments', '{"amount": 1000}'::jsonb, 'Default report payment amount in INR'),
  ('payments.proof.auto_reject_enabled', 'payments', '{"auto_reject_enabled": false}'::jsonb, 'Auto-reject when proof not submitted'),
  ('payments.proof.timeout_days', 'payments', '{"timeout_days": 7}'::jsonb, 'Proof submission timeout in days'),
  ('payments.currency', 'payments', '{"currency": "INR"}'::jsonb, 'Currency code for payments')
ON CONFLICT (key) DO NOTHING;

COMMIT;
