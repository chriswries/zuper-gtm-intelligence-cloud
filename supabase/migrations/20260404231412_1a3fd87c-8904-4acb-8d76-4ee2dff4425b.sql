
-- Event deduplication table for Slack events
CREATE TABLE public.processed_slack_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_slack_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access to processed_slack_events"
ON public.processed_slack_events
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to read full (unmasked) secret from vault - for edge functions via service role
CREATE OR REPLACE FUNCTION public.read_connector_secret_full(p_vault_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = p_vault_key::uuid;
  RETURN v_secret;
END;
$$;

-- Cleanup function for old dedup entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_slack_events()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.processed_slack_events
  WHERE created_at < now() - interval '1 hour';
END;
$$;
