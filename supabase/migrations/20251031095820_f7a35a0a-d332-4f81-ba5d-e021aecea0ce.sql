-- Fix function search_path for security
-- Set immutable search_path on all SECURITY DEFINER functions

-- Update existing functions to have fixed search_path
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins can change roles
  IF (OLD.role != NEW.role AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-confirm email if confirmations are disabled
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_demo_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_demo = true THEN
    -- Ensure demo accounts have valid data
    IF NEW.email IS NULL OR length(trim(NEW.email)) < 5 THEN
      RAISE EXCEPTION 'Demo accounts must have a valid email address';
    END IF;
    
    IF NEW.full_name IS NULL OR length(trim(NEW.full_name)) < 2 THEN
      RAISE EXCEPTION 'Demo accounts must have a valid full name';
    END IF;
    
    -- Prevent obviously fake data patterns
    IF NEW.email ILIKE '%spam%' OR NEW.email ILIKE '%fake%' OR NEW.email ILIKE '%test123%' THEN
      RAISE EXCEPTION 'Invalid email address pattern for demo account';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, mobile_number, station_id, center_address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'mobile_number', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'station_id', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'center_address', '')
  );
  RETURN NEW;
END;
$function$;