import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useConnectorsFull } from "@/hooks/useConnectorsFull";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { AddConnectorDialog } from "@/components/connectors/AddConnectorDialog";

const Connectors = () => {
  const { data: connectors, isLoading } = useConnectorsFull();
  const [showAdd, setShowAdd] = useState(false);

  const shared = connectors?.filter((c) => c.is_shared) ?? [];
  const botSpecific = connectors?.filter((c) => !c.is_shared) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage API connections and credentials</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connector
        </Button>
      </div>

      {/* Shared Connectors */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-medium text-foreground">Shared Connectors</h2>
          <p className="text-xs text-muted-foreground">Available to all bots</p>
        </div>
        <div className="space-y-2">
          {shared.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No shared connectors configured yet.</p>
          ) : (
            shared.map((c) => <ConnectorCard key={c.id} connector={c} />)
          )}
        </div>
      </div>

      {/* Bot-Specific Connectors */}
      {botSpecific.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-medium text-foreground">Bot-Specific Connectors</h2>
            <p className="text-xs text-muted-foreground">Assigned per bot</p>
          </div>
          <div className="space-y-2">
            {botSpecific.map((c) => <ConnectorCard key={c.id} connector={c} />)}
          </div>
        </div>
      )}

      <AddConnectorDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
};

export default Connectors;
