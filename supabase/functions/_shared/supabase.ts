import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Read the full (unmasked) secret value from Vault via the security-definer function.
 */
export async function readVaultSecret(
  supabase: ReturnType<typeof createClient>,
  vaultKey: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("read_connector_secret_full", {
    p_vault_key: vaultKey,
  });
  if (error) {
    console.error("Failed to read vault secret:", error.message);
    return null;
  }
  return data as string | null;
}
