/**
 * Rate-limit awareness utility.
 * Tracks rate-limit headers from API responses and pauses when capacity is low.
 */

interface RateLimitState {
  remaining: number | null;
  resetAt: number | null; // Unix timestamp in seconds
}

const rateLimitStates: Record<string, RateLimitState> = {};

/**
 * Update rate-limit state from API response headers.
 */
export function updateRateLimitFromHeaders(
  apiName: string,
  headers: Headers
): void {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");

  rateLimitStates[apiName] = {
    remaining: remaining !== null ? parseInt(remaining) : null,
    resetAt: reset !== null ? parseInt(reset) : null,
  };
}

/**
 * Check if we should pause before making an API call.
 * Pauses if remaining capacity is below 20% of a reasonable threshold.
 */
export async function checkRateLimit(apiName: string): Promise<void> {
  const state = rateLimitStates[apiName];
  if (!state || state.remaining === null || state.resetAt === null) return;

  // If below 20% remaining capacity (assuming typical limit of ~100)
  if (state.remaining < 20) {
    const now = Math.floor(Date.now() / 1000);
    const waitSeconds = Math.max(0, state.resetAt - now);
    if (waitSeconds > 0 && waitSeconds < 60) {
      console.warn(
        `Rate limit low for ${apiName}: ${state.remaining} remaining. Waiting ${waitSeconds}s`
      );
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    }
  }
}

/**
 * Handle a 429 response: wait for retry-after and return true to signal retry.
 */
export async function handleRateLimitResponse(
  headers: Headers
): Promise<boolean> {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const waitSeconds = parseInt(retryAfter);
    if (!isNaN(waitSeconds) && waitSeconds > 0 && waitSeconds < 120) {
      console.warn(`429 received. Waiting ${waitSeconds}s before retry.`);
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      return true; // Signal caller to retry
    }
  }
  return false;
}
