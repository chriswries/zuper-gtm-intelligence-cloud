import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBotConnectors(botId: string | null) {
  return useQuery({
    queryKey: ["bot_connectors", botId],
    enabled: !!botId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_connectors")
        .select("connector_id")
        .eq("bot_id", botId!);
      if (error) throw error;
      return data.map((r) => r.connector_id);
    },
  });
}

export function useBotConnectorMutations() {
  const qc = useQueryClient();

  const toggleConnector = useMutation({
    mutationFn: async ({ botId, connectorId, assigned }: { botId: string; connectorId: string; assigned: boolean }) => {
      if (assigned) {
        const { error } = await supabase
          .from("bot_connectors")
          .delete()
          .eq("bot_id", botId)
          .eq("connector_id", connectorId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bot_connectors")
          .insert({ bot_id: botId, connector_id: connectorId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot_connectors"] }),
  });

  return { toggleConnector };
}
