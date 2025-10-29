-- Drops the existing foreign key constraint
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;

-- Add new foreign key with ON DELETE SET NULL
ALTER TABLE public.system_settings 
  ADD CONSTRAINT system_settings_updated_by_fkey 
  FOREIGN KEY (updated_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;