// SPIKE 1 - Async invocation: HTTP fetch to research-job-worker URL.
// SPIKE 2 - Vault access: Service-role Supabase client calls read_connector_secret_full() RPC.
// SPIKE 3 - Event deduplication: DB row with unique constraint on event_id.
// SPIKE 4 - Edge Function timeout: Router responds quickly; async work delegated to worker.
// SPIKE 5 - Slack signature verification: HMAC-SHA256 with Web Crypto API.

import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, readVaultSecret } from "../_shared/supabase.ts";
import { verifySlackSignature, postAcknowledgment, postMessage } from "../_shared/slack.ts";
import { runBotPipeline } from "../_shared/pipeline.ts";

const DEFAULT_ACK_MESSAGE = "Got it — looking that up now...";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();

  // --- Slack URL verification challenge ---
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: parsed.challenge }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const supabase = createServiceClient();

  // --- Get Slack signing secret + bot token from Vault ---
  const { data: slackConnectors } = await supabase
    .from("connectors")
    .select("vault_key")
    .eq("connector_type", "slack")
    .eq("status", "configured")
    .limit(1);

  const slackVaultKey = slackConnectors?.[0]?.vault_key;
  let signingSecret: string | null = null;
  let botToken: string | null = null;

  if (slackVaultKey) {
    const secretJson = await readVaultSecret(supabase, slackVaultKey);
    if (secretJson) {
      try {
        const secrets = JSON.parse(secretJson);
        signingSecret = secrets.signing_secret || null;
        botToken = secrets.bot_token || null;
      } catch {
        console.error("Failed to parse Slack connector secrets JSON");
      }
    }
  }

  // --- Verify Slack signature ---
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const slackSig = req.headers.get("x-slack-signature") || "";

  if (signingSecret) {
    const valid = await verifySlackSignature(signingSecret, timestamp, rawBody, slackSig);
    if (!valid) {
      console.warn("Invalid Slack signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }
  } else {
    console.warn("No signing secret configured — skipping signature verification");
  }

  // --- Parse event ---
  const payload = JSON.parse(rawBody);
  if (payload.type !== "event_callback") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const event = payload.event;
  const eventId = payload.event_id;

  // --- Event deduplication ---
  if (eventId) {
    const { data: inserted } = await supabase
      .from("processed_slack_events")
      .insert({ event_id: eventId })
      .select("id");

    if (!inserted || inserted.length === 0) {
      console.log(`Duplicate event ${eventId} — skipping`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
  }

  // --- Filter out bot messages, thread replies, edited messages ---
  if (!event || event.type !== "message") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
  if (event.subtype === "bot_message" || event.subtype === "message_changed") {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
  if (event.bot_id) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
  if (event.thread_ts && event.thread_ts !== event.ts) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const channelId = event.channel;
  const userId = event.user;
  const text = event.text || "";
  const messageTs = event.ts;

  // --- Match channel + trigger pattern to active bots ---
  const { data: bots } = await supabase
    .from("bots")
    .select("*")
    .eq("is_active", true)
    .eq("slack_channel_id", channelId);

  if (!bots || bots.length === 0) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  let matchedBot = null;
  let queryText = text;
  for (const bot of bots) {
    const pattern = bot.trigger_pattern;
    if (!pattern) continue;

    if (bot.trigger_type === "prefix") {
      if (text.toLowerCase().startsWith(pattern.toLowerCase())) {
        matchedBot = bot;
        queryText = text.slice(pattern.length).replace(/^[\s:\-—]+/, "");
        break;
      }
    } else if (bot.trigger_type === "emoji") {
      if (text.startsWith(pattern)) {
        matchedBot = bot;
        queryText = text.slice(pattern.length).trimStart();
        break;
      }
    }
  }

  if (!matchedBot) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // --- Post acknowledgment ---
  if (botToken) {
    const ackMessage = matchedBot.acknowledgment_message || DEFAULT_ACK_MESSAGE;
    await postAcknowledgment(botToken, channelId, userId, ackMessage, messageTs);
  }

  // --- Route based on processing mode ---
  if (matchedBot.processing_mode === "async") {
    // Create a job and invoke the worker
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        bot_id: matchedBot.id,
        query_text: queryText,
        slack_channel_id: channelId,
        slack_user_id: userId,
        slack_thread_ts: messageTs,
        status: "queued",
      })
      .select("id")
      .single();

    if (job) {
      const workerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/research-job-worker`;
      fetch(workerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: job.id }),
      }).catch((err) => console.error("Worker invocation failed:", err));
    }
  } else if (botToken) {
    // Sync processing — run the full pipeline inline
    const pipelineResult = await runBotPipeline({
      bot: {
        id: matchedBot.id,
        name: matchedBot.name,
        system_prompt: matchedBot.system_prompt,
        model: matchedBot.model,
        handler_type: matchedBot.handler_type,
        escalation_user_id: matchedBot.escalation_user_id,
      },
      queryText,
      channelId,
      userId,
      threadTs: messageTs,
      botToken,
    });

    // Log activity
    await supabase.from("activity_log").insert({
      bot_id: matchedBot.id,
      bot_name: matchedBot.name,
      slack_channel_id: channelId,
      slack_user_id: userId,
      query_text: queryText,
      status: pipelineResult.status,
      response_text: pipelineResult.response_text || null,
      error_message: pipelineResult.error_message || null,
      duration_ms: pipelineResult.duration_ms,
      model_used: pipelineResult.model_used,
      input_tokens: pipelineResult.input_tokens,
      output_tokens: pipelineResult.output_tokens,
      estimated_cost_usd: pipelineResult.estimated_cost_usd,
      tool_calls: pipelineResult.tool_calls,
    });

    // Cleanup old dedup entries
    supabase.rpc("cleanup_old_slack_events").then(() => {}).catch(() => {});

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Async bots: activity logging handled by the worker — no stub entry here

  supabase.rpc("cleanup_old_slack_events").then(() => {}).catch(() => {});
  return new Response("OK", { status: 200, headers: corsHeaders });
});
