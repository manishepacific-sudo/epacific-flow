-- Fix notification RLS policies to allow proper creation and viewing

-- Drop existing policies
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view notifications for their role" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create improved RLS policies for notifications
CREATE POLICY "Anyone can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their role notifications" 
ON public.notifications 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE target_role = (
      SELECT role FROM public.profiles WHERE user_id = auth.uid()
    )
  END
);

CREATE POLICY "Users can update their role notifications" 
ON public.notifications 
FOR UPDATE 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE target_role = (
      SELECT role FROM public.profiles WHERE user_id = auth.uid()
    )
  END
);

-- Also update the get_notifications_for_role function to be more robust
CREATE OR REPLACE FUNCTION public.get_notifications_for_role(target_role_param text)
RETURNS TABLE(id uuid, type text, title text, message text, user_id uuid, target_role text, read boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For debugging: ensure we have proper access
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
$$;