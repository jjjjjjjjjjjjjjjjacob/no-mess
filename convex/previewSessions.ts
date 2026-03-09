import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { generateSessionId, generateSessionSecret } from "./lib/utils";

const SESSION_TTL_MS = 600_000; // 10 minutes

/**
 * Create a preview session for an entry.
 * Returns { sessionId, sessionSecret } — the sessionSecret is sent to
 * the iframe via postMessage and never appears in a URL.
 */
export const create = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    // Look up content type for slug denormalization
    const contentType = await ctx.db.get(entry.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    // Lazy cleanup: delete expired sessions for this site
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query("previewSessions")
      .withIndex("by_site", (q) => q.eq("siteId", entry.siteId))
      .collect();

    for (const session of expiredSessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id);
      }
    }

    const sessionId = generateSessionId();
    const sessionSecret = generateSessionSecret();

    await ctx.db.insert("previewSessions", {
      sessionId,
      siteId: entry.siteId,
      entryId: args.entryId,
      contentTypeSlug: contentType.slug,
      entrySlug: entry.slug,
      sessionSecret,
      createdBy: user._id,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    // Look up site for preview URL
    const site = await ctx.db.get(entry.siteId);

    return {
      sessionId,
      sessionSecret,
      siteBaseUrl: site?.previewUrl ?? null,
      previewUrl: site?.previewUrl
        ? `${site.previewUrl}/no-mess-preview?sid=${sessionId}`
        : null,
    };
  },
});

/**
 * Internal query: get a valid (non-expired) preview session by sessionId.
 * Used by the HTTP API exchange endpoint.
 */
export const getValidSession = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("previewSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    if (session.expiresAt < Date.now()) {
      return null;
    }

    return session;
  },
});

/**
 * Internal mutation: mark a session as used (update usedAt timestamp).
 */
export const markSessionUsed = internalMutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("previewSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { usedAt: Date.now() });
    }
  },
});
