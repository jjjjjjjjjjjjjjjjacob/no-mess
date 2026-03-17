/**
 * Build a cache key for a request.
 * Includes the API key since different keys map to different sites/content.
 */
export function buildCacheKey(
  request: Request,
  apiKey: string | null,
): Request {
  const url = new URL(request.url);
  url.searchParams.set("_ck", apiKey ?? "anon");
  return new Request(url.toString(), { method: "GET" });
}

/**
 * Preview and fresh requests must bypass edge caches so draft/live-edit
 * sessions and runtime delivery reflect upstream state immediately.
 */
export function shouldBypassCache(request: Request): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  return (
    url.searchParams.get("preview") === "true" ||
    url.searchParams.get("fresh") === "true"
  );
}
