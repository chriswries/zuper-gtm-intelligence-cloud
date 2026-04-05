import type { Bot } from "@/hooks/useBots";
import type { Connector } from "@/hooks/useConnectorsFull";

/**
 * PRD Section 5.4 — Bot health derivation:
 * - green (online): is_active && prompt && channel && has connectors && all connectors OK
 * - amber (degraded): is_active but missing prompt, or a connector is in error state
 * - red (misconfigured): is_active but missing channel or no connectors assigned
 * - gray (offline): !is_active
 */
export type HealthStatus = "online" | "degraded" | "misconfigured" | "offline";

export function deriveBotHealth(
  bot: Bot,
  connectorIds?: string[],
  connectors?: Connector[],
): HealthStatus {
  if (!bot.is_active) return "offline";

  const hasPrompt = !!bot.system_prompt && bot.system_prompt.trim().length > 0;
  const hasChannel = !!bot.slack_channel_id && bot.slack_channel_id.trim().length > 0 && bot.slack_channel_id !== "TBD";
  const hasConnectors = connectorIds ? connectorIds.length > 0 : true; // default true when unknown

  if (!hasChannel || !hasConnectors) return "misconfigured";

  // Check if any assigned connector is in error state
  if (connectors && connectorIds && connectorIds.length > 0) {
    const hasErrorConnector = connectorIds.some((cid) => {
      const c = connectors.find((cc) => cc.id === cid);
      return c?.status === "error";
    });
    if (hasErrorConnector) return "degraded";
  }

  if (!hasPrompt) return "degraded";

  return "online";
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
