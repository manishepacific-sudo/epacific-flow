-- ============================================================================
-- CRITICAL SECURITY FIX: Fix Authorization and Role Management
-- ============================================================================
-- This migration addresses critical security vulnerabilities:
-- 1. Fix get_current_user_role() to query user_roles table instead of profiles
-- 2. Add proper authorization to notification functions
-- 3. Remove profiles.role column dependency
-- ============================================================================

-- Step 1: Update get_current_user_role() to query user_roles table
-- This fixes the critical privilege escalation vulnerability
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Step 2: Update get_user_role() to also query user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_id_param uuid)
RETURNS TEXT AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = user_id_param
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Step 3: Update get_user_role_for_notifications() to also query user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role_for_notifications(user_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = user_id_param
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$function$;

-- Step 4: Fix create_notification to add proper authorization
CREATE OR REPLACE FUNCTION public.create_notification(
  notification_type text, 
  notification_title text, 
  notification_message text, 
  notification_user_id uuid, 
  notification_target_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_role text;
BEGIN
  -- Get the role of the user creating the notification
  caller_role := get_current_user_role();

  -- Authorization check: 
  -- 1. Users can only create notifications for managers/admins
  -- 2. Managers/Admins can create notifications for any role
  IF caller_role = 'user' AND notification_target_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: Users can only create notifications for managers and admins';
  END IF;

  IF caller_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Unauthorized: Only authenticated users can create notifications';
  END IF;

  -- Input validation
  IF notification_type IS NULL OR notification_type = '' THEN
    RAISE EXCEPTION 'Notification type cannot be empty';
  END IF;
  
  IF notification_title IS NULL OR notification_title = '' THEN
    RAISE EXCEPTION 'Notification title cannot be empty';
  END IF;
  
  IF notification_message IS NULL OR notification_message = '' THEN
    RAISE EXCEPTION 'Notification message cannot be empty';
  END IF;
  
  IF notification_target_role NOT IN ('admin', 'manager', 'user') THEN
    RAISE EXCEPTION 'Invalid target role: %', notification_target_role;
  END IF;

  -- Insert the notification
  INSERT INTO public.notifications (
    type,
    title,
    message,
    user_id,
    target_role,
    read,
    created_at
  ) VALUES (
    notification_type,
    notification_title,
    notification_message,
    notification_user_id,
    notification_target_role,
    false,
    now()
  );
END;
$function$;

-- Step 5: Fix get_notifications_for_role to add proper authorization
CREATE OR REPLACE FUNCTION public.get_notifications_for_role(target_role_param text)
RETURNS TABLE(id uuid, type text, title text, message text, user_id uuid, target_role text, read boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: Users can only fetch notifications for their own role
  IF get_current_user_role() != target_role_param THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access notifications for other roles';
  END IF;

  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.user_id,
    n.target_role,
    n.read,
    n.created_at,
    n.updated_at
  FROM public.notifications n
  WHERE n.target_role = target_role_param
  ORDER BY n.created_at DESC
  LIMIT 50;
END;
$function$;

-- Step 6: Fix mark_notification_read to add proper authorization
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_role text;
BEGIN
  -- Get the target role of the notification
  SELECT target_role INTO notification_role
  FROM public.notifications
  WHERE id = notification_id;

  IF notification_role IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  -- Authorization check: Users can only mark notifications for their own role
  IF get_current_user_role() != notification_role THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify notifications for other roles';
  END IF;

  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE id = notification_id;
END;
$function$;

-- Step 7: Fix mark_all_notifications_read to add proper authorization
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(target_role_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: Users can only mark notifications for their own role
  IF get_current_user_role() != target_role_param THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify notifications for other roles';
  END IF;

  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE target_role = target_role_param AND read = false;
END;
$function$;

-- Step 8: Fix clear_read_notifications to add proper authorization
CREATE OR REPLACE FUNCTION public.clear_read_notifications(target_role_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Authorization check: Users can only clear notifications for their own role
  IF get_current_user_role() != target_role_param THEN
    RAISE EXCEPTION 'Unauthorized: Cannot delete notifications for other roles';
  END IF;

  DELETE FROM public.notifications
  WHERE target_role = target_role_param AND read = true;
END;
$function$;

-- Step 9: Add explicit DELETE policy for attendance table (best practice)
CREATE POLICY "Only admins can delete attendance" 
ON public.attendance 
FOR DELETE 
USING (get_current_user_role() = 'admin'::text);