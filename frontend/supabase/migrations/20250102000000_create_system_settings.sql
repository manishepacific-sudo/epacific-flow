-- Create system_settings table
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    CONSTRAINT valid_category CHECK (category IN ('system', 'security', 'payments', 'integrations'))
);

-- Add table comment
COMMENT ON TABLE public.system_settings IS 'Stores system-wide configuration settings managed by administrators';

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_category ON public.system_settings(category);

-- Create timestamp update trigger function
CREATE OR REPLACE FUNCTION public.update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp update trigger
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_system_settings_timestamp();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_settings_changes()
RETURNS TRIGGER AS $$
DECLARE
    details JSONB;
    user_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        details = jsonb_build_object('new_value', row_to_json(NEW));
        user_id = NEW.updated_by;
    ELSIF TG_OP = 'UPDATE' THEN
        details = jsonb_build_object('old_value', row_to_json(OLD), 'new_value', row_to_json(NEW));
        user_id = NEW.updated_by;
    ELSE
        details = jsonb_build_object('old_value', row_to_json(OLD));
        user_id = OLD.updated_by;
    END IF;

    PERFORM public.log_security_event(
        event_type_param => 'settings_changed',
        target_user_id_param => user_id,
        details_param => details
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
CREATE TRIGGER audit_system_settings_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_settings_changes();

-- Create RLS policies
CREATE POLICY "Only admins can view settings"
    ON public.system_settings
    FOR SELECT
    USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "Only admins can insert settings"
    ON public.system_settings
    FOR INSERT
    WITH CHECK (get_current_user_role() = 'admin'::text);

CREATE POLICY "Only admins can update settings"
    ON public.system_settings
    FOR UPDATE
    USING (get_current_user_role() = 'admin'::text);

CREATE POLICY "Only admins can delete settings"
    ON public.system_settings
    FOR DELETE
    USING (get_current_user_role() = 'admin'::text);

-- Insert seed data
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
    );