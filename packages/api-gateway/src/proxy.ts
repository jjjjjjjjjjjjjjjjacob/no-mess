import { shouldBypassCache } from "./cache";
import type { Env } from "./config";

/**
 * Proxy a request to the Convex HTTP API upstream.
 * Strips Convex-identifying response headers so downstream
 * consumers never see evidence of the underlying backend.
 */
export async function proxyToUpstream(
  env: Env,
  request: Request,
): Promise<Response> {
  const bypassCache = shouldBypassCache(request);
  const url = new URL(request.url);
  const upstreamUrl = new URL(url.pathname + url.search, env.UPSTREAM_URL);

  const headers = new Headers();
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  headers.set(
    "Content-Type",
    request.headers.get("Content-Type") ?? "application/json",
  );
  headers.set("X-Gateway", "no-mess-api-gateway");

  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    headers.set("X-Forwarded-For", cfIp);
  }

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
  });

  // Strip backend-identifying headers
  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete("server");
  responseHeaders.delete("x-convex-request-id");

  if (request.method === "GET") {
    if (bypassCache) {
      responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
    } else if (upstreamResponse.ok) {
      responseHeaders.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
    }
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
