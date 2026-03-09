import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { requireSiteAccess } from "./lib/access";

const ROUTE_REPORT_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSIENT_PARAMS = ["preview", "secret", "sid", "slug", "type"];

function getSiteBaseUrl(site: { previewUrl?: string }) {
  if (!site.previewUrl) {
    throw new ConvexError("Preview URL not configured for this site");
  }

  try {
    return new URL(site.previewUrl);
  } catch {
    throw new ConvexError("Preview URL is invalid for this site");
  }
}

function sortSearchParams(url: URL) {
  const entries = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  url.search = "";
  for (const [key, value] of entries) {
    url.searchParams.append(key, value);
  }
}

function normalizeUrl(input: string, site: { previewUrl?: string }) {
  const siteBaseUrl = getSiteBaseUrl(site);

  let url: URL;
  try {
    url = new URL(input, siteBaseUrl);
  } catch {
    throw new ConvexError("Invalid route URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ConvexError("Route URL must use http or https");
  }

  if (url.origin !== siteBaseUrl.origin) {
    throw new ConvexError("Route URL must match the site preview URL origin");
  }

  const sitePath = siteBaseUrl.pathname.replace(/\/$/, "") || "/";
  const routePath = url.pathname.replace(/\/$/, "") || "/";
  if (
    sitePath !== "/" &&
    routePath !== sitePath &&
    !routePath.startsWith(`${sitePath}/`)
  ) {
    throw new ConvexError(
      "Route URL must stay within the site preview URL path prefix",
    );
  }

  for (const param of TRANSIENT_PARAMS) {
    url.searchParams.delete(param);
  }

  sortSearchParams(url);
  return url.toString();
}

async function upsertRoute(
  ctx: MutationCtx,
  args: {
    siteId: Id<"sites">;
    entryId: Id<"contentEntries">;
    url: string;
    source: "discovered" | "manual";
    selectedAt?: number;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("contentEntryRoutes")
    .withIndex("by_entry_url", (q) =>
      q.eq("entryId", args.entryId).eq("url", args.url),
    )
    .first();

  if (!existing) {
    return await ctx.db.insert("contentEntryRoutes", {
      siteId: args.siteId,
      entryId: args.entryId,
      url: args.url,
      source: args.source,
      firstSeenAt: now,
      lastSeenAt: now,
      lastSelectedAt: args.selectedAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  const patch: Record<string, unknown> = {};
  let shouldPatch = false;

  if (
    args.source === "manual" ||
    now - (existing.lastSeenAt ?? 0) >= ROUTE_REPORT_TTL_MS
  ) {
    patch.lastSeenAt = now;
    shouldPatch = true;
  }

  if (args.source === "manual" && existing.source !== "manual") {
    patch.source = "manual";
    shouldPatch = true;
  }

  if (args.selectedAt !== undefined) {
    patch.lastSelectedAt = args.selectedAt;
    shouldPatch = true;
  }

  if (!shouldPatch) {
    return existing._id;
  }

  patch.updatedAt = now;
  await ctx.db.patch(existing._id, patch);
  return existing._id;
}

export const listForEntry = query({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);

    const routes = await ctx.db
      .query("contentEntryRoutes")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    return routes.sort((a, b) => {
      const aRank = Math.max(a.lastSelectedAt ?? 0, a.lastSeenAt ?? 0);
      const bRank = Math.max(b.lastSelectedAt ?? 0, b.lastSeenAt ?? 0);
      return bRank - aRank || b.firstSeenAt - a.firstSeenAt;
    });
  },
});

export const addManual = mutation({
  args: {
    entryId: v.id("contentEntries"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { site } = await requireSiteAccess(ctx, entry.siteId);
    const url = normalizeUrl(args.url, site);

    return await upsertRoute(ctx, {
      siteId: entry.siteId,
      entryId: args.entryId,
      url,
      source: "manual",
      selectedAt: Date.now(),
    });
  },
});

export const select = mutation({
  args: {
    entryId: v.id("contentEntries"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { site } = await requireSiteAccess(ctx, entry.siteId);
    const url = normalizeUrl(args.url, site);

    return await upsertRoute(ctx, {
      siteId: entry.siteId,
      entryId: args.entryId,
      url,
      source: "manual",
      selectedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: {
    routeId: v.id("contentEntryRoutes"),
  },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) {
      throw new ConvexError("Entry route not found");
    }

    await requireSiteAccess(ctx, route.siteId);
    await ctx.db.delete(args.routeId);
  },
});

export const reportDiscoveredInternal = internalMutation({
  args: {
    siteId: v.id("sites"),
    entryId: v.id("contentEntries"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.siteId !== args.siteId) {
      throw new ConvexError("Content entry not found");
    }

    const site = await ctx.db.get(args.siteId);
    if (!site) {
      throw new ConvexError("Site not found");
    }

    const url = normalizeUrl(args.url, site);

    return await upsertRoute(ctx, {
      siteId: args.siteId,
      entryId: args.entryId,
      url,
      source: "discovered",
    });
  },
});
