-- Create database functions for notification management to bypass TypeScript typing issues

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_user_id UUID,
  notification_target_role TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Function to get notifications for a specific role
CREATE OR REPLACE FUNCTION public.get_notifications_for_role(
  target_role_param TEXT
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  user_id UUID,
  target_role TEXT,
  read BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  LIMIT 20;
END;
$$;

-- Function to mark a notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  notification_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE id = notification_id;
END;
$$;

-- Function to mark all notifications as read for a role
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  target_role_param TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, updated_at = now()
  WHERE target_role = target_role_param AND read = false;
END;
$$;