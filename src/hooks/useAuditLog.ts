import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AuditEntry = Tables<"audit_log">;

export interface AuditFilters {
  actionType?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}

const PAGE_SIZE = 50;

export function useAuditLog(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit_log", filters],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.actionType) query = query.eq("action_type", filters.actionType);
      if (filters.entityType) query = query.eq("entity_type", filters.entityType);
      if (filters.userId) query = query.eq("user_id", filters.userId);
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setDate(end.getDate() + 1);
        query = query.lt("created_at", end.toISOString());
      }

      const from = filters.page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { entries: data ?? [], totalCount: count ?? 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useAuditDistinct() {
  return useQuery({
    queryKey: ["audit_distinct"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("action_type, entity_type, user_id");
      if (error) throw error;
      const actionTypes = [...new Set(data.map((d) => d.action_type))].sort();
      const entityTypes = [...new Set(data.map((d) => d.entity_type))].sort();
      const userIds = [...new Set(data.map((d) => d.user_id).filter(Boolean))] as string[];
      return { actionTypes, entityTypes, userIds };
    },
  });
}
