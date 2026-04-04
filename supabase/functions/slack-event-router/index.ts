// SPIKE 1 - Async invocation: HTTP fetch to research-job-worker URL.
//   The router calls fetch() to invoke the worker. We do NOT await the response
//   body — just fire-and-forget after getting a 200. This avoids blocking the
//   3-second Slack response window. The worker runs independently.
//
// SPIKE 2 - Vault access: Service-role Supabase client calls read_connector_secret_full()
//   RPC function (SECURITY DEFINER). This returns the full decrypted secret from
//   vault.decrypted_secrets without exposing the vault schema directly.
//
// SPIKE 3 - Event deduplication: DB row with unique constraint on event_id in
//   processed_slack_events table. INSERT with ON CONFLICT DO NOTHING — if insert
//   returns no rows, the event was already processed. Old entries cleaned up by
//   cleanup_old_slack_events() (1 hour TTL). Chosen over in-memory because edge
//   functions are stateless across invocations.
//
// SPIKE 4 - Edge Function timeout: Supabase Edge Functions have a 60-second wall
//   clock limit. The router must respond to Slack within 3 seconds; async work is
//   delegated to the worker. The worker has 60s for its processing.
//
// SPIKE 5 - Slack signature verification: HMAC-SHA256 using Web Crypto API
//   (crypto.subtle.importKey + crypto.subtle.sign). Verified compatible with Deno
//   runtime. Timing-safe comparison via XOR to prevent timing attacks.

import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, readVaultSecret } from "../_shared/supabase.ts";
import { verifySlackSignature, postAcknowledgment, postMessage } from "../_shared/slack.ts";

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

  // --- Get Slack signing secret from Vault ---
  // Find the Slack connector to get its vault_key
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
  // Filter thread replies (thread_ts != ts means it's a reply in a thread)
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

  // Find matching bot by trigger pattern
  let matchedBot = null;
  let queryText = text; // cleaned query with trigger stripped
  for (const bot of bots) {
    const pattern = bot.trigger_pattern;
    if (!pattern) continue;

    if (bot.trigger_type === "prefix") {
      if (text.toLowerCase().startsWith(pattern.toLowerCase())) {
        matchedBot = bot;
        // Strip prefix and trim leading whitespace + common punctuation (: - —)
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
        query_text: text,
        slack_channel_id: channelId,
        slack_user_id: userId,
        slack_thread_ts: messageTs,
        status: "queued",
      })
      .select("id")
      .single();

    if (job) {
      // Fire-and-forget invocation of the worker
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
  } else {
    // Sync processing — placeholder for now
    if (botToken) {
      await postMessage(
        botToken,
        channelId,
        "Bot matched but processing not yet implemented.",
        messageTs
      );
    }
  }

  // --- Stub activity_log entry ---
  await supabase.from("activity_log").insert({
    bot_id: matchedBot.id,
    bot_name: matchedBot.name,
    slack_channel_id: channelId,
    slack_user_id: userId,
    query_text: text,
    status: "success",
    response_text: "Skeleton — processing not yet implemented",
  });

  // Periodically clean up old dedup entries
  supabase.rpc("cleanup_old_slack_events").then(() => {}).catch(() => {});

  return new Response("OK", { status: 200, headers: corsHeaders });
});
