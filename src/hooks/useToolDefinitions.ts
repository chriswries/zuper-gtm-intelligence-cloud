import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export type ToolDefinition = Tables<"tool_definitions">;

export function useToolDefinitions(botId: string | null) {
  return useQuery({
    queryKey: ["tool_definitions", botId],
    enabled: !!botId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_definitions")
        .select("*")
        .eq("bot_id", botId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useToolMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const writeAudit = async (
    actionType: string,
    entityId: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null
  ) => {
    await supabase.from("audit_log").insert({
      action_type: actionType,
      entity_type: "tool_definition",
      entity_id: entityId,
      user_id: user?.id ?? null,
      before_state: before,
      after_state: after,
    });
  };

  const createTool = useMutation({
    mutationFn: async (tool: TablesInsert<"tool_definitions">) => {
      const { data, error } = await supabase.from("tool_definitions").insert(tool).select().single();
      if (error) throw error;
      await writeAudit("create", data.id, null, data as unknown as Record<string, unknown>);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tool_definitions"] }),
  });

  const updateTool = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TablesUpdate<"tool_definitions"> }) => {
      const { data, error } = await supabase.from("tool_definitions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tool_definitions"] }),
  });

  const deleteTool = useMutation({
    mutationFn: async (tool: ToolDefinition) => {
      const { error } = await supabase.from("tool_definitions").delete().eq("id", tool.id);
      if (error) throw error;
      await writeAudit("delete", tool.id, tool as unknown as Record<string, unknown>, null);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tool_definitions"] }),
  });

  return { createTool, updateTool, deleteTool };
}
