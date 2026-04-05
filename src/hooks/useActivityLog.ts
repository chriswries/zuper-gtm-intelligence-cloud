import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ActivityEntry = Tables<"activity_log">;

export interface ActivityFilters {
  botId?: string;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  slackUser?: string;
  page: number;
}

const PAGE_SIZE = 50;

export function useActivityLog(filters: ActivityFilters) {
  return useQuery({
    queryKey: ["activity_log", filters],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.botId) {
        query = query.eq("bot_id", filters.botId);
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        // Add a day to include the full end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt("created_at", endDate.toISOString());
      }
      if (filters.slackUser) {
        query = query.ilike("slack_user_name", `%${filters.slackUser}%`);
      }

      const from = filters.page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { entries: data ?? [], totalCount: count ?? 0, pageSize: PAGE_SIZE };
    },
  });
}

export function useDashboardData(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["dashboard_data", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .gte("created_at", dateFrom)
        .lt("created_at", dateTo)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
