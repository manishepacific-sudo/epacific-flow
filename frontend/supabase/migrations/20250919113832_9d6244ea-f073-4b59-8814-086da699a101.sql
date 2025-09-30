-- Create admin account
-- First insert into auth.users table (using admin client would be needed in real scenario)
-- For now, let's create a profile entry that can be linked manually
INSERT INTO public.profiles (
  id,
  user_id, 
  email,
  full_name,
  mobile_number,
  station_id,
  center_address,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid, -- Placeholder UUID for admin
  'admin@epacific.com',
  'System Administrator',
  '9999999999',
  'HQ-001',
  'Head Office, Epacific Technologies',
  'admin',
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;