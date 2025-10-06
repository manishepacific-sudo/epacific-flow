-- Add integration settings seed data
INSERT INTO public.system_settings (key, category, value, description, created_at, updated_at)
VALUES 
  (
    'integrations.email.service',
    'integrations',
    jsonb_build_object(
      'smtpHost', '',
      'smtpPort', 587,
      'smtpUsername', '',
      'smtpPassword', '',
      'fromEmail', '',
      'fromName', 'Epacific Flow',
      'encryption', 'TLS'
    ),
    'Email service configuration including SMTP settings',
    NOW(),
    NOW()
  ),
  (
    'integrations.sms.service',
    'integrations',
    jsonb_build_object(
      'provider', 'Twilio',
      'apiKey', '',
      'apiSecret', '',
      'senderId', ''
    ),
    'SMS service configuration including provider and credentials',
    NOW(),
    NOW()
  ),
  (
    'integrations.notifications.preferences',
    'integrations',
    jsonb_build_object(
      'pushEnabled', true,
      'emailEnabled', true,
      'smsEnabled', false
    ),
    'User notification preferences for different channels',
    NOW(),
    NOW()
  ),
  (
    'integrations.thirdparty.apis',
    'integrations',
    '[]'::jsonb,
    'Third-party API integrations configuration',
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;