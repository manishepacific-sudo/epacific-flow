-- Fix SECURITY DEFINER functions missing search_path protection
-- This prevents privilege escalation attacks via search_path manipulation

-- Fix prevent_self_privilege_escalation function
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from assigning admin or manager roles to themselves
  IF (NEW.user_id = auth.uid() AND NEW.role IN ('admin', 'manager')) THEN
    RAISE EXCEPTION 'Cannot assign privileged roles to yourself';
  END IF;
  
  -- Log role assignment in audit log
  PERFORM log_security_event(
    'role_assigned',
    NEW.user_id,
    jsonb_build_object(
      'role', NEW.role,
      'assigned_by', auth.uid()
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix prevent_profile_role_change function
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only admins can change roles
  IF (OLD.role != NEW.role AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;