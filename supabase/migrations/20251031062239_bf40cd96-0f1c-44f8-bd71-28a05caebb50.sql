-- Confirm the specific user's email
UPDATE auth.users 
SET email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'o6nhsx0vuf2br@prettymail.click' 
  AND email_confirmed_at IS NULL;

-- Create a function to auto-confirm emails on user creation
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email if confirmations are disabled
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm emails on signup
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user_email();