-- Create a dedicated table to log outbound email notifications
CREATE TABLE IF NOT EXISTS public.email_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT, -- report | payment | attendance
  status TEXT, -- sent | failed
  subject TEXT,
  to_email TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_notifications IS 'Audit log for outbound email notifications sent via SMTP';

-- Optional index for querying by user
CREATE INDEX IF NOT EXISTS idx_email_notifications_user ON public.email_notifications(user_id);


