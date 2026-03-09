const TRANSIENT_ROUTE_PARAMS = ["preview", "secret", "sid", "slug", "type"];

function sortSearchParams(url: URL) {
  const entries = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  url.search = "";
  for (const [key, value] of entries) {
    url.searchParams.append(key, value);
  }
}

export function normalizeSiteRouteUrl(input: string, siteBaseUrl: string) {
  const base = new URL(siteBaseUrl);
  const resolved = new URL(input, base);

  if (!["http:", "https:"].includes(resolved.protocol)) {
    throw new Error("Route URL must use http or https");
  }

  if (resolved.origin !== base.origin) {
    throw new Error("Route URL must match the site preview URL origin");
  }

  const basePath = base.pathname.replace(/\/$/, "") || "/";
  const routePath = resolved.pathname.replace(/\/$/, "") || "/";
  if (
    basePath !== "/" &&
    routePath !== basePath &&
    !routePath.startsWith(`${basePath}/`)
  ) {
    throw new Error(
      "Route URL must stay within the site preview URL path prefix",
    );
  }

  for (const param of TRANSIENT_ROUTE_PARAMS) {
    resolved.searchParams.delete(param);
  }

  sortSearchParams(resolved);
  return resolved.toString();
}

export function toRelativeSiteRouteUrl(url: string, siteBaseUrl: string) {
  const resolved = new URL(normalizeSiteRouteUrl(url, siteBaseUrl));
  return `${resolved.pathname}${resolved.search}${resolved.hash}` || "/";
}

export function buildLiveEditRouteUrl(routeUrl: string, sessionId: string) {
  const resolved = new URL(routeUrl);
  resolved.searchParams.set("sid", sessionId);
  return resolved.toString();
}
