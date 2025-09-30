-- Add policy for managers to update all payments
CREATE POLICY "Managers can update all payments" 
ON public.payments 
FOR UPDATE 
USING (get_current_user_role() = 'manager');