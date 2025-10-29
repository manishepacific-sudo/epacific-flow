-- Create a real admin account in Supabase Auth
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- First, try to create the admin user in auth.users
    -- This will only work if the user doesn't already exist
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        recovery_sent_at,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        phone_change_sent_at,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@epacific.com',
        crypt('admin123', gen_salt('bf')),
        now(),
        now(),
        '',
        now(),
        '',
        null,
        '',
        '',
        null,
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Admin User"}',
        false,
        now(),
        now(),
        null,
        null,
        '',
        '',
        null,
        '',
        0,
        null,
        '',
        null,
        false
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- If we couldn't insert (user already exists), get the existing user ID
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@epacific.com';
    END IF;

    -- Now insert or update the profile
    INSERT INTO public.profiles (
        user_id,
        full_name,
        email,
        mobile_number,
        station_id,
        center_address,
        role,
        is_demo,
        password_set,
        created_at,
        updated_at
    ) VALUES (
        admin_user_id,
        'Admin User',
        'admin@epacific.com',
        '1234567890',
        'HQ001',
        'Head Office',
        'admin',
        false,
        true,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_demo = EXCLUDED.is_demo,
        password_set = EXCLUDED.password_set,
        updated_at = now();
END $$;