import { buildCacheKey, shouldBypassCache } from "./cache";
import type { Env } from "./config";
import { addCorsHeaders, handleCorsOptions } from "./cors";
import { logRequest } from "./logger";
import { proxyToUpstream } from "./proxy";
import { checkRateLimit, extractApiKey } from "./rateLimit";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // 1. CORS preflight
    if (request.method === "OPTIONS") {
      return handleCorsOptions();
    }

    // 2. Extract API key for rate limiting and caching
    const apiKey = extractApiKey(request);
    const bypassCache = shouldBypassCache(request);

    // 3. Rate limiting
    const rateLimitResponse = await checkRateLimit(env, apiKey);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 4. Check cache (GET requests only)
    if (request.method === "GET" && !bypassCache) {
      const cacheKey = buildCacheKey(request, apiKey);
      const cachedResponse = await caches.default.match(cacheKey);
      if (cachedResponse) {
        ctx.waitUntil(logRequest(env, request, cachedResponse, true, apiKey));
        return addCorsHeaders(cachedResponse);
      }
    }

    // 5. Proxy to upstream (Convex)
    const response = await proxyToUpstream(env, request);

    // 6. Cache successful GET responses
    if (request.method === "GET" && response.ok && !bypassCache) {
      const cacheKey = buildCacheKey(request, apiKey);
      const responseToCache = response.clone();
      ctx.waitUntil(caches.default.put(cacheKey, responseToCache));
    }

    // 7. Log request asynchronously
    ctx.waitUntil(logRequest(env, request, response, false, apiKey));

    // 8. Add CORS headers and return
    return addCorsHeaders(response);
  },
};
