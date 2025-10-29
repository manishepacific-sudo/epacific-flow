-- Create custom invite tokens table
CREATE TABLE public.invite_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  user_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and managers can create invite tokens"
ON public.invite_tokens
FOR INSERT
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

CREATE POLICY "Admins and managers can view invite tokens"
ON public.invite_tokens
FOR SELECT
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'manager'::text]));

-- Create index for token lookup
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX idx_invite_tokens_email ON public.invite_tokens(email);