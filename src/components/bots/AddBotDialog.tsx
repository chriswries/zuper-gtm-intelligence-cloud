import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBotMutations } from "@/hooks/useBots";
import type { Database } from "@/integrations/supabase/types";

type TriggerType = Database["public"]["Enums"]["trigger_type"];
type HandlerType = Database["public"]["Enums"]["handler_type"];

interface AddBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBotDialog({ open, onOpenChange }: AddBotDialogProps) {
  const { createBot } = useBotMutations();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("prefix");
  const [handlerType, setHandlerType] = useState<HandlerType>("passthrough");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Bot name is required"); return; }
    setSaving(true);
    try {
      await createBot.mutateAsync({
        name,
        trigger_type: triggerType,
        handler_type: handlerType,
      });
      toast.success("Bot created");
      setName("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Bot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Bot Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Slack Bot" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefix">Prefix text</SelectItem>
                  <SelectItem value="emoji">Emoji prefix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Handler Type</Label>
              <Select value={handlerType} onValueChange={(v) => setHandlerType(v as HandlerType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hubspot">HubSpot</SelectItem>
                  <SelectItem value="web_search">Web Search</SelectItem>
                  <SelectItem value="passthrough">Passthrough</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create Bot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
