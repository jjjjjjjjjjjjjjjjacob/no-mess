import type { Env } from "./config";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 120; // 120 req/min per API key

/**
 * Check rate limit for a request based on API key.
 * Uses Cloudflare KV for sliding window tracking.
 * Returns a 429 Response if rate limited, or null if allowed.
 */
export async function checkRateLimit(
  env: Env,
  apiKey: string | null,
): Promise<Response | null> {
  // No KV configured or no API key — skip rate limiting
  if (!env.RATE_LIMIT_KV || !apiKey) {
    return null;
  }

  const key = `rate:${apiKey}`;
  const now = Date.now();

  const raw = await env.RATE_LIMIT_KV.get(key);
  let windowData: { count: number; windowStart: number } = raw
    ? JSON.parse(raw)
    : { count: 0, windowStart: now };

  // Reset window if expired
  if (now - windowData.windowStart > RATE_LIMIT_WINDOW_MS) {
    windowData = { count: 0, windowStart: now };
  }

  windowData.count++;

  // Persist count with TTL
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(windowData), {
    expirationTtl: 120,
  });

  if (windowData.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil(
      (windowData.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000,
    );

    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  return null;
}

/**
 * Extract API key from Authorization header.
 * Returns the key string or null.
 */
export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const key = parts[1];
  // Matches both secret (nm_) and publishable (nm_pub_) keys
  if (!key || !key.startsWith("nm_")) return null;

  return key;
}
