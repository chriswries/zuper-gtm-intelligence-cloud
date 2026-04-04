import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useConnectors() {
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
