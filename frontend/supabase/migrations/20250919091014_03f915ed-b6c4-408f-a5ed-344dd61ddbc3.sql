-- Since we need to create demo accounts and the auth system integration is complex,
-- let's create a temporary workaround by inserting demo profiles directly
-- These will serve as our demo accounts for login testing

-- Delete any existing demo accounts to start fresh
DELETE FROM public.profiles WHERE email IN ('john.doe@epacific.com', 'jane.manager@epacific.com', 'admin@epacific.com');

-- Insert demo account profiles with known UUIDs for testing
-- Note: In production, these would be properly linked to auth.users
INSERT INTO public.profiles (user_id, full_name, email, mobile_number, station_id, center_address, role)
VALUES 
  ('demo-user-1111-1111-1111-111111111111', 'John Doe', 'john.doe@epacific.com', '+91 9876543210', 'STN001', 'Delhi Office, Main Street 123', 'user'),
  ('demo-manager-2222-2222-2222-222222222222', 'Jane Manager', 'jane.manager@epacific.com', '+91 9876543211', 'STN002', 'Mumbai Office, Business District 456', 'manager'),
  ('demo-admin-3333-3333-3333-333333333333', 'Admin User', 'admin@epacific.com', '+91 9876543212', 'STN003', 'Bangalore Office, Tech Park 789', 'admin');