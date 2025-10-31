-- Fix the create_notification function to allow users to notify managers/admins
-- Users can create notifications for managers/admins
-- Managers/Admins can create notifications for users
DROP FUNCTION IF EXISTS public.create_notification(text, text, text, uuid, text);

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
SET search_path = 'public'
AS $$
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
$$;