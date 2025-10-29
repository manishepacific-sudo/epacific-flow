create extension if not exists "uuid-ossp";

-- Add seed data for integration settings
INSERT INTO public.system_settings (id, key, value, category, description, created_at, updated_at)
VALUES 
  -- Email service defaults
  (uuid_generate_v4(), 'integrations.email.service', jsonb_build_object(
    'provider', 'smtp',
    'enabled', false,
    'smtp', jsonb_build_object(
      'host', '',
      'port', 587,
      'username', '',
      'password', '',
      'secure', true
    ),
    'apiKey', '',
    'fromEmail', '',
    'fromName', 'Epacific Flow'
  ), 'integrations', 'Email service configuration', NOW(), NOW()),

  -- SMS service defaults
  (uuid_generate_v4(), 'integrations.sms.service', jsonb_build_object(
    'provider', 'Twilio',
    'apiKey', '',
    'apiSecret', '',
    'senderId', ''
  ), 'integrations', 'SMS service configuration', NOW(), NOW()),

  -- Notification preferences defaults
  (uuid_generate_v4(), 'integrations.notifications.preferences', jsonb_build_object(
    'pushEnabled', true,
    'emailEnabled', true,
    'smsEnabled', false
  ), 'integrations', 'Notification preferences', NOW(), NOW()),

  -- Third-party APIs defaults
  (uuid_generate_v4(), 'integrations.thirdparty.apis', '[]'::jsonb, 'integrations', 'Third-party API configurations', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;