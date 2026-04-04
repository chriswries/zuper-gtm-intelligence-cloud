import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import type { Bot, BotUpdate } from "@/hooks/useBots";
import { useBotMutations } from "@/hooks/useBots";
import { PromptTab } from "./PromptTab";
import { ConfigTab } from "./ConfigTab";
import { ToolsTab } from "./ToolsTab";

interface BotDetailPanelProps {
  bot: Bot | null;
}

export function BotDetailPanel({ bot }: BotDetailPanelProps) {
  const { updateBot } = useBotMutations();

  if (!bot) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-16 text-center">
          <Settings className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Select a bot to configure</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Choose a bot from the list or create a new one.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = async (updates: BotUpdate) => {
    try {
      await updateBot.mutateAsync({ id: bot.id, before: bot, updates });
      toast.success("Bot updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">{bot.name}</h2>
        <Tabs defaultValue="prompt">
          <TabsList className="mb-4">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="prompt">
            <PromptTab bot={bot} onSave={handleSave} saving={updateBot.isPending} />
          </TabsContent>
          <TabsContent value="config">
            <ConfigTab bot={bot} onSave={handleSave} saving={updateBot.isPending} />
          </TabsContent>
          <TabsContent value="tools">
            <ToolsTab botId={bot.id} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
