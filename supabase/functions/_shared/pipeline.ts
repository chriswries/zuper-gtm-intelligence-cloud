/**
 * Bot processing pipeline.
 * Loads bot config, credentials, calls Claude with tools, posts response, logs activity.
 */

import { createServiceClient, readVaultSecret } from "./supabase.ts";
import { postMessage } from "./slack.ts";
import { runClaudeWithTools, estimateCost, type ToolDefinition, type ToolResult } from "./claude.ts";
import { executeHubSpotTools } from "./hubspot.ts";

interface BotConfig {
  id: string;
  name: string;
  system_prompt: string | null;
  model: string;
  handler_type: string;
  escalation_user_id: string | null;
}

interface PipelineContext {
  bot: BotConfig;
  queryText: string;
  channelId: string;
  userId: string;
  threadTs: string;
  botToken: string;
  jobId?: string;
}

interface PipelineResult {
  response_text: string;
  input_tokens: number;
  output_tokens: number;
  model_used: string;
  estimated_cost_usd: number;
  duration_ms: number;
  tool_calls: unknown[];
  status: "success" | "error" | "rate_limited";
  error_message?: string;
}

/**
 * Load credentials needed for a bot's handler type from Vault.
 */
export async function loadCredentials(
  supabase: ReturnType<typeof createServiceClient>,
  handlerType: string
): Promise<{ anthropicKey: string | null; hubspotKey: string | null; inputCostPerMtok: number; outputCostPerMtok: number }> {
  let anthropicKey: string | null = null;
  let hubspotKey: string | null = null;
  let inputCostPerMtok = 3;
  let outputCostPerMtok = 15;

  // Load Anthropic key + pricing rates
  const { data: anthropicConnectors } = await supabase
    .from("connectors")
    .select("vault_key")
    .eq("connector_type", "anthropic")
    .eq("status", "configured")
    .limit(1);

  if (anthropicConnectors?.[0]?.vault_key) {
    const secretJson = await readVaultSecret(supabase, anthropicConnectors[0].vault_key);
    if (secretJson) {
      try {
        const secrets = JSON.parse(secretJson);
        anthropicKey = secrets.api_key || null;
        if (secrets.input_cost_per_mtok != null) inputCostPerMtok = Number(secrets.input_cost_per_mtok);
        if (secrets.output_cost_per_mtok != null) outputCostPerMtok = Number(secrets.output_cost_per_mtok);
      } catch { /* ignore */ }
    }
  }

  // Load HubSpot key if needed
  if (handlerType === "hubspot") {
    const { data: hubspotConnectors } = await supabase
      .from("connectors")
      .select("vault_key")
      .eq("connector_type", "hubspot")
      .eq("status", "configured")
      .limit(1);

    if (hubspotConnectors?.[0]?.vault_key) {
      const secretJson = await readVaultSecret(supabase, hubspotConnectors[0].vault_key);
      if (secretJson) {
        try {
          const secrets = JSON.parse(secretJson);
          hubspotKey = secrets.api_key || null;
        } catch { /* ignore */ }
      }
    }
  }

  return { anthropicKey, hubspotKey };
}

/**
 * Load tool definitions from the database for a bot.
 */
export async function loadToolDefinitions(
  supabase: ReturnType<typeof createServiceClient>,
  botId: string
): Promise<ToolDefinition[]> {
  const { data: tools } = await supabase
    .from("tool_definitions")
    .select("tool_name, tool_description, input_schema")
    .eq("bot_id", botId)
    .eq("is_active", true)
    .order("sort_order");

  if (!tools) return [];

  return tools.map((t) => ({
    name: t.tool_name,
    description: t.tool_description || "",
    input_schema: (t.input_schema as Record<string, unknown>) || { type: "object", properties: {} },
  }));
}

/**
 * Run the full bot processing pipeline.
 */
export async function runBotPipeline(ctx: PipelineContext): Promise<PipelineResult> {
  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    // Load credentials
    const { anthropicKey, hubspotKey } = await loadCredentials(supabase, ctx.bot.handler_type);

    if (!anthropicKey) {
      throw new Error("Anthropic API key not configured. Please set up an Anthropic connector.");
    }

    if (ctx.bot.handler_type === "hubspot" && !hubspotKey) {
      throw new Error("HubSpot API key not configured. Please set up a HubSpot connector.");
    }

    // Load tool definitions
    const tools = await loadToolDefinitions(supabase, ctx.bot.id);

    // Build tool executor based on handler type
    const executeTools = async (
      toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>
    ): Promise<ToolResult[]> => {
      if (ctx.bot.handler_type === "hubspot" && hubspotKey) {
        return executeHubSpotTools(hubspotKey, toolCalls);
      }
      // Default: return error for unknown tools
      return toolCalls.map((tc) => ({
        tool_use_id: tc.id,
        content: JSON.stringify({ error: `No executor for handler type: ${ctx.bot.handler_type}` }),
        is_error: true,
      }));
    };

    // Run Claude with tools
    const result = await runClaudeWithTools({
      apiKey: anthropicKey,
      model: ctx.bot.model,
      systemPrompt: ctx.bot.system_prompt || "You are a helpful assistant.",
      userMessage: ctx.queryText,
      tools,
      executeTools,
      escalationUserId: ctx.bot.escalation_user_id,
    });

    const durationMs = Date.now() - startTime;
    const costUsd = estimateCost(result.input_tokens, result.output_tokens);

    // Format response for Slack (mrkdwn: double asterisks for bold)
    let slackResponse = result.response_text;

    // Add escalation mention if needed
    if (result.escalation_needed && ctx.bot.escalation_user_id) {
      slackResponse += `\n\ncc <@${ctx.bot.escalation_user_id}> — I wasn't able to fully answer this question.`;
    }

    // Post response in thread @mentioning user
    const fullResponse = `<@${ctx.userId}> ${slackResponse}`;
    await postMessage(ctx.botToken, ctx.channelId, fullResponse, ctx.threadTs);

    return {
      response_text: result.response_text,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      model_used: result.model_used,
      estimated_cost_usd: costUsd,
      duration_ms: durationMs,
      tool_calls: result.tool_calls,
      status: "success",
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Check if rate limited
    const isRateLimited = errorMessage.includes("rate limit") || errorMessage.includes("429");

    // Post error message in thread
    const userMessage = isRateLimited
      ? `<@${ctx.userId}> I'm currently experiencing high demand and need to pause briefly. Please try again in a moment.`
      : `<@${ctx.userId}> ⚠️ I encountered an error processing your request. The team has been notified.`;

    await postMessage(ctx.botToken, ctx.channelId, userMessage, ctx.threadTs);

    return {
      response_text: "",
      input_tokens: 0,
      output_tokens: 0,
      model_used: ctx.bot.model,
      estimated_cost_usd: 0,
      duration_ms: durationMs,
      tool_calls: [],
      status: isRateLimited ? "rate_limited" : "error",
      error_message: errorMessage,
    };
  }
}
