-- Create demo accounts for testing
-- Note: These should be created via Supabase Auth admin, but for demo purposes we'll create profiles

-- First, let's ensure we have demo user profiles
INSERT INTO public.profiles (user_id, full_name, email, mobile_number, station_id, center_address, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'John Doe', 'john.doe@epacific.com', '+91 9876543210', 'STN001', 'Delhi Office, Main Street 123', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'Jane Manager', 'jane.manager@epacific.com', '+91 9876543211', 'STN002', 'Mumbai Office, Business District 456', 'manager'),
  ('33333333-3333-3333-3333-333333333333', 'Admin User', 'admin@epacific.com', '+91 9876543212', 'STN003', 'Bangalore Office, Tech Park 789', 'admin')
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  mobile_number = EXCLUDED.mobile_number,
  station_id = EXCLUDED.station_id,
  center_address = EXCLUDED.center_address,
  role = EXCLUDED.role;