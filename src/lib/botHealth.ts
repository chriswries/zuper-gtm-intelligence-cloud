import type { Bot } from "@/hooks/useBots";

/**
 * PRD Section 5.4 — Bot health derivation:
 * - green (online): is_active && system_prompt is set && slack_channel_id is set
 * - amber (degraded): is_active but missing system_prompt or slack_channel_id
 * - red (misconfigured): is_active but handler_type connectors not configured (simplified: missing slack_channel_id)
 * - gray (offline): !is_active
 */
export type HealthStatus = "online" | "degraded" | "misconfigured" | "offline";

export function deriveBotHealth(bot: Bot): HealthStatus {
  if (!bot.is_active) return "offline";
  const hasPrompt = !!bot.system_prompt && bot.system_prompt.trim().length > 0;
  const hasChannel = !!bot.slack_channel_id && bot.slack_channel_id.trim().length > 0 && bot.slack_channel_id !== "TBD";
  if (hasPrompt && hasChannel) return "online";
  if (!hasChannel) return "misconfigured";
  return "degraded";
}

export const healthColors: Record<HealthStatus, string> = {
  online: "bg-green-500",
  degraded: "bg-amber-500",
  misconfigured: "bg-red-500",
  offline: "bg-muted-foreground/40",
};

export const healthLabels: Record<HealthStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  misconfigured: "Misconfigured",
  offline: "Offline",
};
