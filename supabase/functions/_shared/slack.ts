/**
 * Slack Web API client utilities.
 * All calls go through the Slack Web API directly using the bot token.
 */

const SLACK_API_BASE = "https://slack.com/api";

// Simple throttle: track last post time per channel to avoid flooding
const lastPostTime: Record<string, number> = {};
const MIN_POST_INTERVAL_MS = 1000;

async function throttle(channelId: string): Promise<void> {
  const now = Date.now();
  const last = lastPostTime[channelId] || 0;
  const diff = now - last;
  if (diff < MIN_POST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_POST_INTERVAL_MS - diff));
  }
  lastPostTime[channelId] = Date.now();
}

export async function postMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs?: string
): Promise<{ ok: boolean; error?: string; ts?: string }> {
  await throttle(channel);

  const body: Record<string, string> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;

  const res = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  return await res.json();
}

export async function postAcknowledgment(
  botToken: string,
  channel: string,
  userId: string,
  message: string,
  threadTs: string
): Promise<{ ok: boolean; error?: string }> {
  // Replace {user} placeholder with @mention, or prepend if no placeholder
  const text = message.includes("{user}")
    ? message.replace("{user}", `<@${userId}>`)
    : `<@${userId}> ${message}`;

  return postMessage(botToken, channel, text, threadTs);
}

/**
 * Verify Slack request signature using HMAC-SHA256.
 */
export async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): Promise<boolean> {
  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.warn("Slack signature timestamp too old");
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(sigBasestring));
  const hexSig = "v0=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (hexSig.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hexSig.length; i++) {
    mismatch |= hexSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
