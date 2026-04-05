/**
 * Web Search executor for the research bot.
 * Uses Anthropic's built-in web search tool (server-side tool).
 * 
 * When Claude requests a web_search tool call, the Anthropic API handles it
 * natively — no external search API needed. This module provides a fallback
 * executor for custom web_search tool definitions and configures the
 * Anthropic request to enable built-in web search.
 */

import { checkRateLimit } from "./rate-limit.ts";

const SEARCH_API_NAME = "web_search";

/**
 * Anthropic built-in web search tool definition.
 * This is a server-side tool that Anthropic executes automatically.
 */
export const ANTHROPIC_WEB_SEARCH_TOOL = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 20,
};

/**
 * Execute a web search using a third-party search API (fallback).
 * Used when bot has custom web_search tool definitions rather than
 * relying on Anthropic's built-in tool.
 */
export async function executeWebSearch(
  query: string,
  _numResults: number = 5
): Promise<{ results: Array<{ title: string; url: string; snippet: string }> }> {
  await checkRateLimit(SEARCH_API_NAME);

  // Fallback: return instruction for Claude to acknowledge limitation
  return {
    results: [{
      title: "Search unavailable",
      url: "",
      snippet: `Web search is handled natively by the AI model. Query: "${query}"`,
    }],
  };
}
