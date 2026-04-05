CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_local text;
BEGIN
  v_display_name := NEW.raw_user_meta_data->>'display_name';

  IF v_display_name IS NULL OR v_display_name = '' THEN
    -- Derive from email: replace dots/underscores with spaces, then initcap
    v_local := split_part(NEW.email, '@', 1);
    v_local := replace(replace(v_local, '.', ' '), '_', ' ');
    v_display_name := initcap(v_local);
  END IF;

  INSERT INTO public.users (id, email, display_name, role)
  VALUES (NEW.id, NEW.email, v_display_name, 'admin');
  RETURN NEW;
END;
$function$;