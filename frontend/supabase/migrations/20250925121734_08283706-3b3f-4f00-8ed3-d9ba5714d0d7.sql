-- Create function to clear read notifications for a specific role
CREATE OR REPLACE FUNCTION public.clear_read_notifications(target_role_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.notifications
  WHERE target_role = target_role_param AND read = true;
END;
$function$