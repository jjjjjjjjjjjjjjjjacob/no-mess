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
