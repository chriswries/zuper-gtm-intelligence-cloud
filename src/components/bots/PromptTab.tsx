import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Bot, BotUpdate } from "@/hooks/useBots";
import type { Database } from "@/integrations/supabase/types";

type ModelType = Database["public"]["Enums"]["model_type"];

interface PromptTabProps {
  bot: Bot;
  onSave: (updates: BotUpdate) => Promise<void>;
  saving: boolean;
}

export function PromptTab({ bot, onSave, saving }: PromptTabProps) {
  const [description, setDescription] = useState(bot.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(bot.system_prompt ?? "");
  const [model, setModel] = useState<ModelType>(bot.model);
  const [isActive, setIsActive] = useState(bot.is_active);

  useEffect(() => {
    setDescription(bot.description ?? "");
    setSystemPrompt(bot.system_prompt ?? "");
    setModel(bot.model);
    setIsActive(bot.is_active);
  }, [bot.id]);

  const handleToggleActive = (checked: boolean) => {
    if (checked && !systemPrompt.trim()) {
      toast.error("Cannot activate bot without a system prompt");
      return;
    }
    setIsActive(checked);
  };

  const handleSave = () => {
    onSave({ description, system_prompt: systemPrompt, model, is_active: isActive });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Description</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this bot do?" />
      </div>

      <div className="space-y-2">
        <Label>System Prompt</Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are an AI assistant that..."
          className="font-mono text-sm min-h-[400px] resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={model} onValueChange={(v) => setModel(v as ModelType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sonnet">Sonnet</SelectItem>
            <SelectItem value="opus">Opus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isActive} onCheckedChange={handleToggleActive} />
        <Label className="cursor-pointer">Responds to Slack events</Label>
      </div>

      <Button onClick={handleSave} disabled={saving} className="mt-2">
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
