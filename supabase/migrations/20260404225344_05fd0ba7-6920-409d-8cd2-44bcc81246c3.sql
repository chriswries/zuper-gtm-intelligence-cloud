
CREATE OR REPLACE FUNCTION public.enforce_zuper_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT NEW.email ILIKE '%@zuper.co' THEN
    RAISE EXCEPTION 'Only @zuper.co email addresses are allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_zuper_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_zuper_email();
