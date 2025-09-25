-- Drop the insecure "Anyone can create notifications" policy
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;

-- Create secure policy: Only admins and managers can create notifications directly
CREATE POLICY "Only admins and managers can create notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Update the create_notification function to be more secure
-- This allows the function to bypass RLS when called by authenticated edge functions
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
BEGIN
  -- Additional validation
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
$function$