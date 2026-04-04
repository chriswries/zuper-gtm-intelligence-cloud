import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Connector } from "@/hooks/useConnectorsFull";
import { useConnectorMutations, useConnectorBotNames, getMaskedSecret } from "@/hooks/useConnectorsFull";
import { credentialFieldsByType, connectorTypeLabels, statusConfig } from "@/lib/connectorFields";
import type { Database } from "@/integrations/supabase/types";
import type { TablesUpdate } from "@/integrations/supabase/types";

type ConnectorType = Database["public"]["Enums"]["connector_type"];

interface ConnectorCardProps {
  connector: Connector;
}

export function ConnectorCard({ connector }: ConnectorCardProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(connector.description ?? "");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [maskedValues, setMaskedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { updateConnector, deleteConnector } = useConnectorMutations();
  const { data: botNames } = useConnectorBotNames(connector.is_shared ? connector.id : null);

  const fields = credentialFieldsByType[connector.connector_type] ?? [];
  const status = statusConfig[connector.status];

  // Load masked values when expanding
  useEffect(() => {
    if (open && connector.vault_key && Object.keys(maskedValues).length === 0) {
      getMaskedSecret(connector.vault_key).then((masked) => {
        if (masked) {
          try {
            // Parse JSON to see how many keys, but show a single masked value
            setMaskedValues(
              Object.fromEntries(fields.map((f) => [f.key, masked]))
            );
          } catch {
            setMaskedValues(
              Object.fromEntries(fields.map((f) => [f.key, masked]))
            );
          }
        }
      });
    }
  }, [open, connector.vault_key]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const hasNewCreds = Object.values(credentials).some((v) => v.trim());
      const updates: TablesUpdate<"connectors"> = { description: description || null };
      await updateConnector.mutateAsync({
        id: connector.id,
        before: connector,
        updates,
        credentials: hasNewCreds ? credentials : undefined,
      });
      setCredentials({});
      toast.success("Connector updated");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteConnector.mutateAsync(connector);
      toast.success("Connector deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <CollapsibleTrigger className="flex items-center gap-3 text-sm font-medium text-foreground hover:underline">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${status.color}`} />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">{status.label}</TooltipContent>
          </Tooltip>
          {connector.name}
        </CollapsibleTrigger>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
          {connectorTypeLabels[connector.connector_type]}
        </Badge>
      </div>

      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="min-h-[60px]"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-semibold">Credentials</Label>
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs">{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
              <Input
                type={field.type}
                value={credentials[field.key] ?? ""}
                onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={
                  maskedValues[field.key]
                    ? maskedValues[field.key]
                    : field.placeholder
                }
              />
              {maskedValues[field.key] && !credentials[field.key] && (
                <p className="text-[10px] text-muted-foreground">Leave blank to keep current value</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{connector.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  {connector.is_shared && botNames && botNames.length > 0 ? (
                    <>
                      <span className="font-semibold text-destructive">Warning:</span> This shared connector is used by: {botNames.join(", ")}. Deleting it will remove it from those bots.
                    </>
                  ) : (
                    "This action cannot be undone."
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
