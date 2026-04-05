
CREATE OR REPLACE FUNCTION public.store_connector_secret(p_name text, p_secret text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  v_id := vault.create_secret(p_secret, p_name);
  RETURN v_id::text;
END;
$function$;
