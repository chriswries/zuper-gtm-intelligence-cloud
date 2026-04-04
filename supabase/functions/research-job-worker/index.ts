import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";
import { createServiceClient, readVaultSecret } from "../_shared/supabase.ts";
import { postMessage } from "../_shared/slack.ts";

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

  // Read the job
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

  try {
    // Placeholder: simulate processing
    await new Promise((r) => setTimeout(r, 2000));

    // Post placeholder response
    if (botToken && job.slack_channel_id && job.slack_thread_ts) {
      await postMessage(
        botToken,
        job.slack_channel_id,
        "Research processing not yet implemented.",
        job.slack_thread_ts
      );
    }

    // Mark completed
    await supabase
      .from("jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", job_id);

    // Log activity
    const bot = job.bots;
    await supabase.from("activity_log").insert({
      bot_id: job.bot_id,
      bot_name: bot?.name || "Unknown",
      slack_channel_id: job.slack_channel_id,
      slack_user_id: job.slack_user_id,
      query_text: job.query_text,
      status: "success",
      response_text: "Worker skeleton — processing not yet implemented",
    });
  } catch (err) {
    console.error("Worker error:", err);

    // Mark failed
    await supabase
      .from("jobs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: err instanceof Error ? err.message : String(err),
      })
      .eq("id", job_id);

    // Post error in thread
    if (botToken && job.slack_channel_id && job.slack_thread_ts) {
      await postMessage(
        botToken,
        job.slack_channel_id,
        "⚠️ An error occurred while processing your request. The team has been notified.",
        job.slack_thread_ts
      );
    }

    // Log error activity
    await supabase.from("activity_log").insert({
      bot_id: job.bot_id,
      bot_name: job.bots?.name || "Unknown",
      slack_channel_id: job.slack_channel_id,
      slack_user_id: job.slack_user_id,
      query_text: job.query_text,
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
