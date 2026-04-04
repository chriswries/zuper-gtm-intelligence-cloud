import type { Database } from "@/integrations/supabase/types";

type ConnectorType = Database["public"]["Enums"]["connector_type"];

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder?: string;
  required?: boolean;
}

export const credentialFieldsByType: Record<ConnectorType, CredentialField[]> = {
  slack: [
    { key: "bot_token", label: "Bot Token", type: "password", placeholder: "xoxb-...", required: true },
    { key: "signing_secret", label: "Signing Secret", type: "password", placeholder: "Signing secret from Slack app settings", required: true },
  ],
  anthropic: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-ant-...", required: true },
    { key: "input_rate", label: "Input Rate ($/1K tokens)", type: "text", placeholder: "0.003" },
    { key: "output_rate", label: "Output Rate ($/1K tokens)", type: "text", placeholder: "0.015" },
  ],
  hubspot: [
    { key: "api_key", label: "Private App API Key", type: "password", placeholder: "pat-...", required: true },
  ],
  web_search: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "API key (or leave blank for Anthropic built-in)" },
  ],
  custom: [
    { key: "key_1", label: "Key 1", type: "password", placeholder: "Value" },
    { key: "key_2", label: "Key 2", type: "password", placeholder: "Value" },
    { key: "key_3", label: "Key 3", type: "password", placeholder: "Value" },
  ],
};

export const connectorTypeLabels: Record<ConnectorType, string> = {
  slack: "Slack",
  anthropic: "Anthropic",
  hubspot: "HubSpot",
  web_search: "Web Search",
  custom: "Custom",
};

export const statusConfig = {
  configured: { color: "bg-green-500", label: "Configured" },
  not_configured: { color: "bg-muted-foreground/40", label: "Not Configured" },
  error: { color: "bg-red-500", label: "Error" },
} as const;
