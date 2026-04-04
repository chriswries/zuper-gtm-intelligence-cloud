import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { deriveBotHealth, healthColors, healthLabels } from "@/lib/botHealth";
import type { Bot as BotType } from "@/hooks/useBots";

const modelBadgeColors: Record<string, string> = {
  sonnet: "bg-blue-100 text-blue-800 border-blue-200",
  opus: "bg-purple-100 text-purple-800 border-purple-200",
};

const handlerLabels: Record<string, string> = {
  hubspot: "HubSpot",
  web_search: "Web Search",
  passthrough: "Passthrough",
  custom: "Custom",
};

interface BotListPanelProps {
  bots: BotType[];
  selectedBotId: string | null;
  onSelect: (id: string) => void;
  onAddBot: () => void;
}

export function BotListPanel({ bots, selectedBotId, onSelect, onAddBot }: BotListPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">Bots</CardTitle>
        <Button size="sm" variant="outline" onClick={onAddBot} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> Add Bot
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        {bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Bot className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No bots configured yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Create your first bot to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bots.map((bot) => {
              const health = deriveBotHealth(bot);
              const isSelected = bot.id === selectedBotId;
              return (
                <button
                  key={bot.id}
                  onClick={() => onSelect(bot.id)}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent/50 ${
                    isSelected ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${healthColors[health]}`} />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">{healthLabels[health]}</TooltipContent>
                    </Tooltip>
                    <span className="text-sm font-medium text-foreground truncate">{bot.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-4">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${modelBadgeColors[bot.model] ?? ""}`}>
                      {bot.model.charAt(0).toUpperCase() + bot.model.slice(1)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {handlerLabels[bot.handler_type] ?? bot.handler_type}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
