import { useState } from "react";
import { useBots } from "@/hooks/useBots";
import { BotListPanel } from "@/components/bots/BotListPanel";
import { BotDetailPanel } from "@/components/bots/BotDetailPanel";
import { AddBotDialog } from "@/components/bots/AddBotDialog";

const BotSettings = () => {
  const { data: bots, isLoading } = useBots();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

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
