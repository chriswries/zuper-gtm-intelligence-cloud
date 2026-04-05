import { useState } from "react";
import { useBots } from "@/hooks/useBots";
import { useConnectorsFull } from "@/hooks/useConnectorsFull";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BotListPanel } from "@/components/bots/BotListPanel";
import { BotDetailPanel } from "@/components/bots/BotDetailPanel";
import { AddBotDialog } from "@/components/bots/AddBotDialog";

const BotSettings = () => {
  const { data: bots, isLoading } = useBots();
  const { data: connectors } = useConnectorsFull();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch all bot_connectors to build a map
  const { data: allBotConnectors } = useQuery({
    queryKey: ["all_bot_connectors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bot_connectors").select("bot_id, connector_id");
      if (error) throw error;
      return data;
    },
  });

  const botConnectorMap = new Map<string, string[]>();
  allBotConnectors?.forEach((bc) => {
    const list = botConnectorMap.get(bc.bot_id) ?? [];
    list.push(bc.connector_id);
    botConnectorMap.set(bc.bot_id, list);
  });

  const selectedBot = bots?.find((b) => b.id === selectedBotId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bot Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure and manage your Slack bots</p>
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[600px]">
        <div className="col-span-4">
          <BotListPanel
            bots={bots ?? []}
            selectedBotId={selectedBotId}
            onSelect={setSelectedBotId}
            onAddBot={() => setShowAddDialog(true)}
            botConnectorMap={botConnectorMap}
            connectors={connectors}
          />
        </div>
        <div className="col-span-8">
          <BotDetailPanel bot={selectedBot} />
        </div>
      </div>

      <AddBotDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
};

export default BotSettings;
