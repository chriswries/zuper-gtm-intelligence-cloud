/**
 * Claude API client with tool-use loop, rate-limit awareness, and token tracking.
 * Uses Anthropic Messages API v1.
 */

import { updateRateLimitFromHeaders, checkRateLimit, handleRateLimitResponse } from "./rate-limit.ts";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const API_NAME = "anthropic";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ClaudeResponse {
  response_text: string;
  input_tokens: number;
  output_tokens: number;
  model_used: string;
  tool_calls: Array<{ name: string; input: Record<string, unknown>; result?: string }>;
  stop_reason: string;
  escalation_needed: boolean;
}

/**
 * Execute a full Claude conversation with tool-use loop.
 * Calls Claude, handles tool_use blocks, executes tools, feeds results back.
 * Loops until Claude produces end_turn or max iterations reached.
 */
export async function runClaudeWithTools(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  tools: ToolDefinition[];
  executeTools: (toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>) => Promise<ToolResult[]>;
  maxIterations?: number;
  escalationUserId?: string | null;
  /** Anthropic built-in server-side tools (e.g. web_search_20250305) */
  serverTools?: Array<Record<string, unknown>>;
}): Promise<ClaudeResponse> {
  const { apiKey, model, systemPrompt, userMessage, tools, executeTools, escalationUserId, serverTools } = opts;
  const maxIterations = opts.maxIterations ?? 10;

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "user", content: userMessage },
  ];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const allToolCalls: ClaudeResponse["tool_calls"] = [];
  let finalText = "";
  let stopReason = "";
  let modelUsed = model;

  // Map model_type enum to Anthropic model IDs
  const modelId = model === "opus" ? "claude-opus-4-20250514" : "claude-sonnet-4-20250514";

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    await checkRateLimit(API_NAME);

    const body: Record<string, unknown> = {
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
      }));
    }

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`Anthropic API network error: ${err}`);
    }

    updateRateLimitFromHeaders(API_NAME, response.headers);

    if (response.status === 429) {
      const retried = await handleRateLimitResponse(response.headers);
      if (retried) {
        // Retry the same iteration
        iteration--;
        continue;
      }
      throw new Error("Anthropic rate limited and retry failed");
    }

    if (!response.ok) {
      const errText = await response.text();
      const prefix = response.status === 401 || response.status === 403
        ? "Anthropic authentication error"
        : "Anthropic API error";
      throw new Error(`${prefix} ${response.status}: ${errText}`);
    }

    const data = await response.json();
    totalInputTokens += data.usage?.input_tokens || 0;
    totalOutputTokens += data.usage?.output_tokens || 0;
    modelUsed = data.model || modelId;
    stopReason = data.stop_reason || "";

    // Extract text blocks and tool_use blocks
    const textBlocks: string[] = [];
    const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

    for (const block of data.content || []) {
      if (block.type === "text") {
        textBlocks.push(block.text);
      } else if (block.type === "tool_use") {
        toolUseBlocks.push({ id: block.id, name: block.name, input: block.input });
      }
    }

    if (textBlocks.length > 0) {
      finalText = textBlocks.join("\n");
    }

    // If no tool use, we're done
    if (toolUseBlocks.length === 0 || stopReason === "end_turn") {
      break;
    }

    // Execute tools
    const toolResults = await executeTools(toolUseBlocks);

    // Track tool calls for logging
    for (let i = 0; i < toolUseBlocks.length; i++) {
      const tc = toolUseBlocks[i];
      const result = toolResults.find((r) => r.tool_use_id === tc.id);
      allToolCalls.push({
        name: tc.name,
        input: tc.input,
        result: result?.content?.substring(0, 500), // truncate for logging
      });
    }

    // Add assistant response and tool results to conversation
    messages.push({ role: "assistant", content: data.content });
    messages.push({
      role: "user",
      content: toolResults.map((r) => ({
        type: "tool_result",
        tool_use_id: r.tool_use_id,
        content: r.content,
        is_error: r.is_error || false,
      })),
    });
  }

  // Check if Claude tagged the escalation user in its response
  const escalationNeeded = escalationUserId
    ? finalText.includes(`<@${escalationUserId}>`)
    : false;

  return {
    response_text: finalText,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    model_used: modelUsed,
    tool_calls: allToolCalls,
    stop_reason: stopReason,
    escalation_needed: escalationNeeded,
  };
}

/**
 * Estimate cost in USD based on pricing rates.
 * Defaults: $3/MTok input, $15/MTok output (Sonnet pricing).
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  inputCostPerMtok: number = 3,
  outputCostPerMtok: number = 15
): number {
  return (inputTokens * inputCostPerMtok + outputTokens * outputCostPerMtok) / 1_000_000;
}
