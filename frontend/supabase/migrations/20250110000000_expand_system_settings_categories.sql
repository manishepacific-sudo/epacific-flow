-- Migration: Expand system_settings category CHECK constraint
-- Purpose: Add new categories required for Admin Settings Page enhancements
BEGIN;

-- Drop the existing constraint if it exists
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS valid_category;

-- Recreate the CHECK constraint with expanded categories
ALTER TABLE public.system_settings ADD CONSTRAINT valid_category CHECK (category IN (
  'system',
  'security',
  'payments',
  'integrations',
  'attendance',
  'reports',
  'notifications',
  'app_config'
));

COMMENT ON TABLE public.system_settings IS 'System settings table used by the Admin Settings page. Categories expanded to support attendance, reports, notifications and app_config.';

COMMIT;
