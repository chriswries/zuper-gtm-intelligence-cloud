import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type Bot = Tables<"bots">;
export type BotInsert = TablesInsert<"bots">;
export type BotUpdate = TablesUpdate<"bots">;

export function useBots() {
  return useQuery({
    queryKey: ["bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useBotMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const writeAudit = async (
    actionType: string,
    entityId: string,
    beforeState: Record<string, unknown> | null,
    afterState: Record<string, unknown> | null
  ) => {
    await supabase.from("audit_log").insert({
      action_type: actionType,
      entity_type: "bot",
      entity_id: entityId,
      user_id: user?.id ?? null,
      before_state: beforeState,
      after_state: afterState,
    });
  };

  const createBot = useMutation({
    mutationFn: async (bot: BotInsert) => {
      const { data, error } = await supabase.from("bots").insert(bot).select().single();
      if (error) throw error;
      await writeAudit("create", data.id, null, data as unknown as Record<string, unknown>);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bots"] }),
  });

  const updateBot = useMutation({
    mutationFn: async ({ id, before, updates }: { id: string; before: Bot; updates: BotUpdate }) => {
      const { data, error } = await supabase.from("bots").update(updates).eq("id", id).select().single();
      if (error) throw error;
      await writeAudit("update", id, before as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bots"] }),
  });

  return { createBot, updateBot };
}
