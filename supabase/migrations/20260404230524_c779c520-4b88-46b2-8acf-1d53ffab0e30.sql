
-- Store a secret in vault, return the vault secret ID as text key
CREATE OR REPLACE FUNCTION public.store_connector_secret(p_name text, p_secret text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.create_secret(p_secret, p_name);
  RETURN v_id::text;
END;
$$;

-- Read masked version of a secret (last 4 chars visible)
CREATE OR REPLACE FUNCTION public.read_connector_secret_masked(p_vault_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_len int;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_vault_key::uuid;

  IF v_secret IS NULL THEN
    RETURN NULL;
  END IF;

  v_len := length(v_secret);
  IF v_len <= 4 THEN
    RETURN repeat('•', v_len);
  END IF;

  RETURN repeat('•', v_len - 4) || right(v_secret, 4);
END;
$$;

-- Update an existing vault secret
CREATE OR REPLACE FUNCTION public.update_connector_secret(p_vault_key text, p_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vault.secrets
  SET secret = p_secret
  WHERE id = p_vault_key::uuid;
END;
$$;

-- Delete a vault secret
CREATE OR REPLACE FUNCTION public.delete_connector_secret(p_vault_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_vault_key::uuid;
END;
$$;
