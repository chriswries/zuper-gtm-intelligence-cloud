/**
 * HubSpot tool executor.
 * Executes HubSpot API v3 calls on behalf of Claude tool_use blocks.
 * Includes exponential backoff for rate limits (max 3 retries: 1s/2s/4s).
 */

const HUBSPOT_API = "https://api.hubapi.com";

interface HubSpotToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

async function hubspotFetch(
  apiKey: string,
  path: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const opts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (body && method !== "GET") {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${HUBSPOT_API}${path}`, opts);

    if (res.status === 429 && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`HubSpot 429, retry ${attempt + 1} after ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    const data = await res.json().catch(() => ({ error: "Failed to parse response" }));
    return { ok: res.ok, status: res.status, data };
  }

  return { ok: false, status: 429, data: { error: "Rate limited after retries" } };
}

/**
 * Execute a batch of HubSpot tool calls and return results.
 */
export async function executeHubSpotTools(
  apiKey: string,
  toolCalls: HubSpotToolCall[]
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    try {
      const result = await executeSingle(apiKey, call);
      results.push(result);
    } catch (err) {
      results.push({
        tool_use_id: call.id,
        content: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
        is_error: true,
      });
    }
  }

  return results;
}

async function executeSingle(apiKey: string, call: HubSpotToolCall): Promise<ToolResult> {
  const { id, name, input } = call;

  switch (name) {
    case "search_crm_objects": {
      const objectType = input.object_type as string;
      const filters = input.filters as Array<{ propertyName: string; operator: string; value: string }> || [];
      const properties = input.properties as string[] || [];
      const limit = (input.limit as number) || 10;
      const after = input.after as string | undefined;

      const body: Record<string, unknown> = {
        filterGroups: filters.length > 0 ? [{ filters }] : [],
        properties,
        limit,
      };
      if (after) body.after = after;

      const res = await hubspotFetch(apiKey, `/crm/v3/objects/${objectType}/search`, "POST", body);
      if (!res.ok) {
        return { tool_use_id: id, content: JSON.stringify({ error: `HubSpot API error ${res.status}`, details: res.data }), is_error: true };
      }
      return { tool_use_id: id, content: JSON.stringify(res.data) };
    }

    case "get_crm_objects": {
      const objectType = input.object_type as string;
      const objectId = input.object_id as string;
      const properties = input.properties as string[] || [];
      const associations = input.associations as string[] || [];

      const params = new URLSearchParams();
      if (properties.length) params.set("properties", properties.join(","));
      if (associations.length) params.set("associations", associations.join(","));

      const res = await hubspotFetch(apiKey, `/crm/v3/objects/${objectType}/${objectId}?${params}`);
      if (!res.ok) {
        return { tool_use_id: id, content: JSON.stringify({ error: `HubSpot API error ${res.status}`, details: res.data }), is_error: true };
      }
      return { tool_use_id: id, content: JSON.stringify(res.data) };
    }

    case "get_properties": {
      const objectType = input.object_type as string;
      const res = await hubspotFetch(apiKey, `/crm/v3/properties/${objectType}`);
      if (!res.ok) {
        return { tool_use_id: id, content: JSON.stringify({ error: `HubSpot API error ${res.status}`, details: res.data }), is_error: true };
      }
      // Return a summary (property names, labels, types) to save tokens
      const data = res.data as { results?: Array<{ name: string; label: string; type: string; description?: string }> };
      const summary = (data.results || []).map((p) => ({
        name: p.name,
        label: p.label,
        type: p.type,
        description: p.description,
      }));
      return { tool_use_id: id, content: JSON.stringify({ properties: summary }) };
    }

    case "search_properties": {
      const objectType = input.object_type as string;
      const query = (input.query as string || "").toLowerCase();
      const res = await hubspotFetch(apiKey, `/crm/v3/properties/${objectType}`);
      if (!res.ok) {
        return { tool_use_id: id, content: JSON.stringify({ error: `HubSpot API error ${res.status}`, details: res.data }), is_error: true };
      }
      const data = res.data as { results?: Array<{ name: string; label: string; type: string; description?: string }> };
      const matches = (data.results || []).filter((p) =>
        p.name.toLowerCase().includes(query) || p.label.toLowerCase().includes(query)
      );
      return { tool_use_id: id, content: JSON.stringify({ properties: matches.slice(0, 20) }) };
    }

    case "search_owners": {
      const query = (input.query as string || "").toLowerCase();
      const res = await hubspotFetch(apiKey, `/crm/v3/owners`);
      if (!res.ok) {
        return { tool_use_id: id, content: JSON.stringify({ error: `HubSpot API error ${res.status}`, details: res.data }), is_error: true };
      }
      const data = res.data as { results?: Array<{ id: string; email: string; firstName: string; lastName: string }> };
      let owners = data.results || [];
      if (query) {
        owners = owners.filter((o) =>
          o.email?.toLowerCase().includes(query) ||
          o.firstName?.toLowerCase().includes(query) ||
          o.lastName?.toLowerCase().includes(query)
        );
      }
      return { tool_use_id: id, content: JSON.stringify({ owners: owners.slice(0, 20) }) };
    }

    default:
      return { tool_use_id: id, content: JSON.stringify({ error: `Unknown tool: ${name}` }), is_error: true };
  }
}
