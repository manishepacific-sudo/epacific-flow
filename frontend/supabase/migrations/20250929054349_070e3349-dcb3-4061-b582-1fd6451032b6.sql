-- Update RLS policy to allow managers to create other managers
-- WARNING: This reduces security by allowing managers to escalate privileges

DROP POLICY IF EXISTS "Managers can create user profiles only" ON public.profiles;

-- Create new policy allowing managers to create both users and managers
CREATE POLICY "Managers can create user and manager profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (get_current_user_role() = 'manager'::text) 
  AND (role = ANY(ARRAY['user'::text, 'manager'::text]))
);

-- Keep the admin policy unchanged
-- Admins can still create any profile type