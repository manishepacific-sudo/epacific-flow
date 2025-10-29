-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('security', 'payments', 'notifications', 'general', 'integrations', 'company')),
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.system_settings IS 'System-wide configuration settings managed by administrators';

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Create trigger to update updated_at
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies - All authenticated users can read settings
CREATE POLICY "Anyone can read system settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert settings
CREATE POLICY "Only admins can insert settings"
    ON public.system_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
    ON public.system_settings
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Only admins can delete settings"
    ON public.system_settings
    FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Insert seed data
INSERT INTO public.system_settings (key, category, value, description) VALUES
    (
        'session.timeout.duration',
        'security',
        '15',
        'Session timeout duration in minutes'
    ),
    (
        'session.timeout.warning',
        'security',
        '2',
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