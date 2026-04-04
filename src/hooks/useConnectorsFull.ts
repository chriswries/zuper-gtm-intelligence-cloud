import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type Connector = Tables<"connectors">;
export type ConnectorInsert = TablesInsert<"connectors">;

export function useConnectorsFull() {
  return useQuery({
    queryKey: ["connectors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connectors")
        .select("*")
        .order("is_shared", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

/** Fetch bots that reference a connector via bot_connectors */
export function useConnectorBotNames(connectorId: string | null) {
  return useQuery({
    queryKey: ["connector_bots", connectorId],
    enabled: !!connectorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_connectors")
        .select("bot_id, bots(name)")
        .eq("connector_id", connectorId!);
      if (error) throw error;
      return data.map((r: any) => r.bots?.name as string).filter(Boolean);
    },
  });
}

export function useConnectorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const writeAudit = async (
    actionType: string,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ) => {
    await supabase.from("audit_log").insert([{
      action_type: actionType,
      entity_type: "connector",
      entity_id: entityId,
      user_id: user?.id ?? null,
      before_state: before as unknown as Json,
      after_state: after as unknown as Json,
    }]);
  };

  const createConnector = useMutation({
    mutationFn: async ({
      connector,
      credentials,
    }: {
      connector: ConnectorInsert;
      credentials: Record<string, string>;
    }) => {
      let vaultKey: string | null = null;
      const hasCredentials = Object.values(credentials).some((v) => v.trim());

      if (hasCredentials) {
        const secretName = `connector_${Date.now()}`;
        const { data, error } = await supabase.rpc("store_connector_secret", {
          p_name: secretName,
          p_secret: JSON.stringify(credentials),
        });
        if (error) throw error;
        vaultKey = data;
      }

      const { data, error } = await supabase
        .from("connectors")
        .insert({
          ...connector,
          vault_key: vaultKey,
          status: hasCredentials ? "configured" : "not_configured",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      await writeAudit("create", data.id, null, data as unknown as Record<string, unknown>);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });

  const updateConnector = useMutation({
    mutationFn: async ({
      id,
      before,
      updates,
      credentials,
    }: {
      id: string;
      before: Connector;
      updates: TablesUpdate<"connectors">;
      credentials?: Record<string, string>;
    }) => {
      const hasNewCredentials = credentials && Object.values(credentials).some((v) => v.trim());

      if (hasNewCredentials) {
        if (before.vault_key) {
          await supabase.rpc("update_connector_secret", {
            p_vault_key: before.vault_key,
            p_secret: JSON.stringify(credentials),
          });
        } else {
          const secretName = `connector_${Date.now()}`;
          const { data } = await supabase.rpc("store_connector_secret", {
            p_name: secretName,
            p_secret: JSON.stringify(credentials),
          });
          updates.vault_key = data;
        }
        updates.status = "configured";
      }

      const { data, error } = await supabase
        .from("connectors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      await writeAudit("update", id, before as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });

  const deleteConnector = useMutation({
    mutationFn: async (connector: Connector) => {
      if (connector.vault_key) {
        await supabase.rpc("delete_connector_secret", {
          p_vault_key: connector.vault_key,
        });
      }
      const { error } = await supabase.from("connectors").delete().eq("id", connector.id);
      if (error) throw error;
      await writeAudit("delete", connector.id, connector as unknown as Record<string, unknown>, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connectors"] }),
  });

  return { createConnector, updateConnector, deleteConnector };
}

export async function getMaskedSecret(vaultKey: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("read_connector_secret_masked", {
    p_vault_key: vaultKey,
  });
  if (error) return null;
  return data;
}
