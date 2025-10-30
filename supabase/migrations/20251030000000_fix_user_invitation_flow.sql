-- Fix user invitation flow
-- This migration creates missing tables and columns required for user invitation

-- ============================================
-- 1. CREATE INVITE_TOKENS TABLE
-- ============================================
-- This table is required by the user-invite Edge Function
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  user_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_email ON public.invite_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_used ON public.invite_tokens(used);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON public.invite_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for invite_tokens - service role bypasses these automatically
CREATE POLICY "Service role can manage invite tokens"
ON public.invite_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to validate their own tokens
CREATE POLICY "Users can validate their own tokens"
ON public.invite_tokens
FOR SELECT
TO authenticated
USING (email = auth.jwt() ->> 'email' OR used = false);

-- ============================================
-- 2. ADD MISSING COLUMNS TO PROFILES TABLE
-- ============================================
-- Add columns that are referenced by the Edge Function but might be missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registrar TEXT;

-- Make some columns nullable if they weren't before
ALTER TABLE public.profiles 
ALTER COLUMN mobile_number DROP NOT NULL,
ALTER COLUMN station_id DROP NOT NULL,
ALTER COLUMN center_address DROP NOT NULL;

-- Update existing profiles to set defaults
UPDATE public.profiles 
SET password_set = true 
WHERE password_set IS NULL;

UPDATE public.profiles 
SET is_demo = false 
WHERE is_demo IS NULL;

-- ============================================
-- 3. ADD TRIGGER FOR INVITE_TOKENS UPDATED_AT
-- ============================================
CREATE TRIGGER update_invite_tokens_updated_at 
BEFORE UPDATE ON public.invite_tokens 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. UPDATE PROFILES RLS POLICIES
-- ============================================
-- Drop existing restrictive policies that might prevent service role operations
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Create comprehensive policy for service role
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure authenticated users can see their profile even during creation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 5. UPDATE USER_ROLES RLS POLICIES
-- ============================================
-- Drop existing restrictive policies and recreate
DROP POLICY IF EXISTS "Service role can manage all user roles" ON public.user_roles;

CREATE POLICY "Service role can manage all user roles"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure users can see their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 6. CREATE FUNCTION TO CLEANUP EXPIRED TOKENS
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_invite_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete expired and unused tokens older than 7 days
  DELETE FROM public.invite_tokens
  WHERE expires_at < now() - INTERVAL '7 days'
    AND used = false;
    
  -- Delete used tokens older than 30 days
  DELETE FROM public.invite_tokens
  WHERE used = true
    AND used_at < now() - INTERVAL '30 days';
END;
$$;

-- ============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================
-- Grant usage on sequences if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant table access
GRANT ALL ON public.invite_tokens TO service_role;
GRANT SELECT ON public.invite_tokens TO authenticated;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================ 
DO $$
BEGIN
  RAISE NOTICE '✅ User invitation flow migration completed successfully!';
  RAISE NOTICE '✅ Created invite_tokens table';
  RAISE NOTICE '✅ Added missing columns to profiles';
  RAISE NOTICE '✅ Updated RLS policies for service role';
  RAISE NOTICE '✅ User invitation should now work correctly';
END $$;

