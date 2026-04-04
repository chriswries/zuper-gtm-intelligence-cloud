import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConnectorMutations } from "@/hooks/useConnectorsFull";
import { credentialFieldsByType, connectorTypeLabels } from "@/lib/connectorFields";
import type { Database } from "@/integrations/supabase/types";

type ConnectorType = Database["public"]["Enums"]["connector_type"];

const connectorTypes: ConnectorType[] = ["slack", "anthropic", "hubspot", "web_search", "custom"];

interface AddConnectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddConnectorDialog({ open, onOpenChange }: AddConnectorDialogProps) {
  const { createConnector } = useConnectorMutations();
  const [name, setName] = useState("");
  const [connectorType, setConnectorType] = useState<ConnectorType>("anthropic");
  const [isShared, setIsShared] = useState(true);
  const [description, setDescription] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fields = credentialFieldsByType[connectorType] ?? [];

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Connector name is required"); return; }
    setSaving(true);
    try {
      await createConnector.mutateAsync({
        connector: {
          name,
          connector_type: connectorType,
          is_shared: isShared,
          description: description || null,
        },
        credentials,
      });
      toast.success("Connector created");
      setName("");
      setDescription("");
      setCredentials({});
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Connector</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production Anthropic" />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={connectorType} onValueChange={(v) => { setConnectorType(v as ConnectorType); setCredentials({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {connectorTypes.map((t) => (
                  <SelectItem key={t} value={t}>{connectorTypeLabels[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isShared} onCheckedChange={setIsShared} />
            <Label className="cursor-pointer">Shared across all bots</Label>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[60px]"
            />
          </div>

          <div className="space-y-3">
            <Label className="font-semibold text-xs">Credentials</Label>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
                <Input
                  type={field.type}
                  value={credentials[field.key] ?? ""}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>

          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create Connector"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
