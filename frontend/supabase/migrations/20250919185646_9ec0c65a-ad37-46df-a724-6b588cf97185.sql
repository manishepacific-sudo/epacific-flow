-- Allow anonymous demo users to create their own profiles
CREATE POLICY "Anonymous users can create demo profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Allow anonymous demo users to view their own profiles  
CREATE POLICY "Anonymous users can view their own profiles"
ON public.profiles
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow anonymous demo users to create their own reports
CREATE POLICY "Anonymous users can create their own reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous demo users to view their own reports
CREATE POLICY "Anonymous users can view their own reports"
ON public.reports
FOR SELECT
USING (auth.uid() = user_id);

-- Allow anonymous demo users to update their own pending reports
CREATE POLICY "Anonymous users can update their own pending reports"
ON public.reports
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Allow anonymous demo users to create their own payments
CREATE POLICY "Anonymous users can create their own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous demo users to view their own payments
CREATE POLICY "Anonymous users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);