import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Bot, BotUpdate } from "@/hooks/useBots";
import type { Tables, Database } from "@/integrations/supabase/types";
import { useBotConnectors, useBotConnectorMutations } from "@/hooks/useBotConnectors";
import { useConnectors } from "@/hooks/useConnectors";

type TriggerType = Database["public"]["Enums"]["trigger_type"];
type HandlerType = Database["public"]["Enums"]["handler_type"];
type ProcessingMode = Database["public"]["Enums"]["processing_mode"];

interface ConfigTabProps {
  bot: Bot;
  onSave: (updates: BotUpdate) => Promise<void>;
  saving: boolean;
}

export function ConfigTab({ bot, onSave, saving }: ConfigTabProps) {
  const [slackChannelId, setSlackChannelId] = useState(bot.slack_channel_id ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(bot.trigger_type);
  const [triggerPattern, setTriggerPattern] = useState(bot.trigger_pattern ?? "");
  const [handlerType, setHandlerType] = useState<HandlerType>(bot.handler_type);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>(bot.processing_mode);
  const [ackMessage, setAckMessage] = useState(bot.acknowledgment_message ?? "");
  const [escalationUserId, setEscalationUserId] = useState(bot.escalation_user_id ?? "");

  const { data: connectors } = useConnectors();
  const { data: assignedConnectorIds } = useBotConnectors(bot.id);
  const { toggleConnector } = useBotConnectorMutations();

  useEffect(() => {
    setSlackChannelId(bot.slack_channel_id ?? "");
    setTriggerType(bot.trigger_type);
    setTriggerPattern(bot.trigger_pattern ?? "");
    setHandlerType(bot.handler_type);
    setProcessingMode(bot.processing_mode);
    setAckMessage(bot.acknowledgment_message ?? "");
    setEscalationUserId(bot.escalation_user_id ?? "");
  }, [bot.id]);

  const handleSave = () => {
    onSave({
      slack_channel_id: slackChannelId,
      trigger_type: triggerType,
      trigger_pattern: triggerPattern,
      handler_type: handlerType,
      processing_mode: processingMode,
      acknowledgment_message: ackMessage || null,
      escalation_user_id: escalationUserId || null,
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Slack Channel ID <span className="text-destructive">*</span></Label>
        <Input value={slackChannelId} onChange={(e) => setSlackChannelId(e.target.value)} placeholder="C0APEM1UX3Q" />
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
          <Label>Trigger Pattern</Label>
          <Input value={triggerPattern} onChange={(e) => setTriggerPattern(e.target.value)} placeholder={triggerType === "emoji" ? "🔍" : "HubSpot question"} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label>Processing Mode</Label>
          <Select value={processingMode} onValueChange={(v) => setProcessingMode(v as ProcessingMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sync">Synchronous</SelectItem>
              <SelectItem value="async">Asynchronous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Acknowledgment Message</Label>
        <Textarea
          value={ackMessage}
          onChange={(e) => setAckMessage(e.target.value)}
          placeholder="@user Got it — looking that up now..."
          className="min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Escalation Slack User ID</Label>
        <Input value={escalationUserId} onChange={(e) => setEscalationUserId(e.target.value)} placeholder="U078XRYVB3N" />
      </div>

      {connectors && connectors.length > 0 && (
        <div className="space-y-2">
          <Label>Connector Assignments</Label>
          <div className="space-y-2 rounded-md border border-border p-3">
            {connectors.map((c) => {
              const assigned = assignedConnectorIds?.includes(c.id) ?? false;
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={assigned}
                    onCheckedChange={() => toggleConnector.mutate({ botId: bot.id, connectorId: c.id, assigned })}
                  />
                  <span>{c.name}</span>
                  {c.is_shared && <span className="text-[10px] text-muted-foreground">(shared)</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
