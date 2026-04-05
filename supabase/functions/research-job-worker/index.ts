import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, readVaultSecret } from "../_shared/supabase.ts";
import { postMessage } from "../_shared/slack.ts";
import { runBotPipeline } from "../_shared/pipeline.ts";

const WORKER_TIMEOUT_MS = 120_000; // 2 minutes
const DEDUP_WINDOW_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const { job_id } = await req.json();
  if (!job_id) {
    return new Response(
      JSON.stringify({ error: "job_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createServiceClient();

  // Read the job with bot config
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*, bots(*)")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    console.error("Job not found:", job_id, jobError?.message);
    return new Response(
      JSON.stringify({ error: "Job not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Duplicate detection: check for a similar recent job (same bot, similar query, queued/running)
  if (job.bot_id && job.query_text) {
    const { data: dupes } = await supabase
      .from("jobs")
      .select("id")
      .eq("bot_id", job.bot_id)
      .eq("query_text", job.query_text)
      .neq("id", job_id)
      .in("status", ["queued", "running", "completed"])
      .gte("created_at", new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString())
      .limit(1);

    if (dupes && dupes.length > 0) {
      console.log(`Duplicate job detected for query "${job.query_text}" — skipping`);
      await supabase
        .from("jobs")
        .update({ status: "completed", completed_at: new Date().toISOString(), error_message: "Duplicate request — skipped" })
        .eq("id", job_id);

      // Notify user in Slack
      let botToken: string | null = null;
      const { data: slackConnectors } = await supabase
        .from("connectors")
        .select("vault_key")
        .eq("connector_type", "slack")
        .eq("status", "configured")
        .limit(1);
      if (slackConnectors?.[0]?.vault_key) {
        const secretJson = await readVaultSecret(supabase, slackConnectors[0].vault_key);
        if (secretJson) {
          try { botToken = JSON.parse(secretJson).bot_token || null; } catch { /* ignore */ }
        }
      }
      if (botToken && job.slack_channel_id && job.slack_thread_ts) {
        await postMessage(
          botToken,
          job.slack_channel_id,
          `<@${job.slack_user_id}> This research was already requested recently — check the thread above for results.`,
          job.slack_thread_ts
        );
      }

      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Update job to running
  await supabase
    .from("jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", job_id);

  // Get bot token from Vault
  let botToken: string | null = null;
  const { data: slackConnectors } = await supabase
    .from("connectors")
    .select("vault_key")
    .eq("connector_type", "slack")
    .eq("status", "configured")
    .limit(1);

  if (slackConnectors?.[0]?.vault_key) {
    const secretJson = await readVaultSecret(supabase, slackConnectors[0].vault_key);
    if (secretJson) {
      try {
        botToken = JSON.parse(secretJson).bot_token || null;
      } catch { /* ignore */ }
    }
  }

  const bot = job.bots;

  try {
    if (!bot) throw new Error("Bot not found for job");
    if (!botToken) throw new Error("Slack bot token not configured");

    // Run the full pipeline with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Worker timeout: research took longer than 2 minutes")), WORKER_TIMEOUT_MS)
    );

    const result = await Promise.race([
      runBotPipeline({
        bot: {
          id: bot.id,
          name: bot.name,
          system_prompt: bot.system_prompt,
          model: bot.model,
          handler_type: bot.handler_type,
          escalation_user_id: bot.escalation_user_id,
        },
        queryText: job.query_text || "",
        channelId: job.slack_channel_id || "",
        userId: job.slack_user_id || "",
        threadTs: job.slack_thread_ts || "",
        botToken,
        jobId: job_id,
      }),
      timeoutPromise,
    ]);

    // Mark completed or failed
    await supabase
      .from("jobs")
      .update({
        status: result.status === "success" ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        error_message: result.error_message || null,
      })
      .eq("id", job_id);

    // Log activity
    await supabase.from("activity_log").insert({
      bot_id: job.bot_id,
      bot_name: bot?.name || "Unknown",
      slack_channel_id: job.slack_channel_id,
      slack_user_id: job.slack_user_id,
      query_text: job.query_text,
      status: result.status,
      response_text: result.response_text || null,
      error_message: result.error_message || null,
      duration_ms: result.duration_ms,
      model_used: result.model_used,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      estimated_cost_usd: result.estimated_cost_usd,
      tool_calls: result.tool_calls,
    });
  } catch (err) {
    console.error("Worker error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isTimeout = errorMessage.includes("timeout");

    await supabase
      .from("jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", job_id);

    if (botToken && job.slack_channel_id && job.slack_thread_ts) {
      const escalationTag = bot?.escalation_user_id ? ` <@${bot.escalation_user_id}>` : "";
      const userMsg = isTimeout
        ? `<@${job.slack_user_id}> ⚠️ The research took too long and was stopped. Please try again with a more specific query.${escalationTag}`
        : `<@${job.slack_user_id}> ⚠️ An error occurred while processing your request. The team has been notified.${escalationTag}`;
      await postMessage(botToken, job.slack_channel_id, userMsg, job.slack_thread_ts);
    }

    await supabase.from("activity_log").insert({
      bot_id: job.bot_id,
      bot_name: bot?.name || "Unknown",
      slack_channel_id: job.slack_channel_id,
      slack_user_id: job.slack_user_id,
      query_text: job.query_text,
      status: isTimeout ? "timeout" : "error",
      error_message: errorMessage,
    });
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
