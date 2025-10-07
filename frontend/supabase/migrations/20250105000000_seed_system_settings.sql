-- Migration to ensure system settings seed data exists
-- This migration is idempotent and can be run multiple times safely
-- It will only insert settings that don't already exist (based on key)
-- Existing settings will be preserved without modification

INSERT INTO public.system_settings (key, category, value, description) VALUES
    (
        'session.timeout.duration',
        'security',
        '{"minutes": 15}',
        'Session timeout duration in minutes'
    ),
    (
        'session.timeout.warning',
        'security',
        '{"minutes": 2}',
        'Warning time before session expires in minutes'
    ),
    (
        'payments.methods',
        'payments',
        '[{"id": "razorpay", "name": "Razorpay", "description": "Pay online with credit/debit card", "enabled": true}, {"id": "offline", "name": "Offline Payment", "description": "Bank transfer with proof upload", "enabled": true}]',
        'Available payment methods'
    ),
    (
        'payments.bank.details',
        'payments',
        '{"accountName": "Epacific Services", "accountNumber": "1234567890", "ifscCode": "SBI0001234", "bankName": "State Bank of India"}',
        'Bank account details for offline payments'
    )
ON CONFLICT (key) DO NOTHING;