-- CRITICAL SECURITY FIX: Prevent manager privilege escalation
-- Drop the insecure policy that allows managers to create other managers
DROP POLICY IF EXISTS "Managers can create user and manager profiles" ON public.profiles;

-- Create new restricted policy: Managers can only create user profiles
CREATE POLICY "Managers can create user profiles only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (get_current_user_role() = 'manager'::text) 
  AND (role = 'user'::text)
);

-- Create audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin'::text);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  target_user_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    target_user_id,
    details
  ) VALUES (
    event_type_param,
    auth.uid(),
    target_user_id_param,
    details_param
  );
END;
$$;

-- Create trigger to log profile role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log role changes
  IF (TG_OP = 'UPDATE' AND OLD.role != NEW.role) THEN
    PERFORM log_security_event(
      'role_change',
      NEW.user_id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  -- Log new profile creation with role assignment
  IF (TG_OP = 'INSERT' AND NEW.role IN ('admin', 'manager')) THEN
    PERFORM log_security_event(
      'privileged_profile_created',
      NEW.user_id,
      jsonb_build_object(
        'role', NEW.role,
        'created_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for role change auditing
DROP TRIGGER IF EXISTS audit_profile_role_changes ON public.profiles;
CREATE TRIGGER audit_profile_role_changes
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

-- Enhance demo account rate limiting
DROP POLICY IF EXISTS "Secure demo profile creation" ON public.profiles;
CREATE POLICY "Secure demo profile creation with rate limiting" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (is_demo = true) 
  AND (role = 'user'::text) 
  AND (password_set = false)
  -- Rate limit: Max 5 demo accounts per hour per IP (tracked at application level)
  AND (
    SELECT count(*) 
    FROM profiles 
    WHERE is_demo = true 
    AND created_at > (now() - interval '1 hour')
  ) < 5
);