import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { slugify } from "./lib/utils";

/**
 * Internal query: get an entry by ID and return draft content.
 * Used by the preview exchange endpoint.
 */
export const getByIdInternal = internalQuery({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      return null;
    }

    return {
      slug: entry.slug,
      title: entry.title,
      ...((entry.draft as Record<string, unknown>) ?? {}),
      _id: entry._id,
      _status: entry.status,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    };
  },
});

export const create = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
    title: v.string(),
    slug: v.optional(v.string()),
    draft: v.any(),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const { user } = await requireSiteAccess(ctx, contentType.siteId);

    const entrySlug = args.slug ?? slugify(args.title);

    const existing = await ctx.db
      .query("contentEntries")
      .withIndex("by_slug", (q) =>
        q
          .eq("siteId", contentType.siteId)
          .eq("contentTypeId", args.contentTypeId)
          .eq("slug", entrySlug),
      )
      .first();

    if (existing) {
      throw new ConvexError("An entry with this slug already exists");
    }

    const now = Date.now();

    const entryId = await ctx.db.insert("contentEntries", {
      siteId: contentType.siteId,
      contentTypeId: args.contentTypeId,
      title: args.title,
      slug: entrySlug,
      draft: args.draft,
      status: "draft",
      createdAt: now,
      createdBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });

    return entryId;
  },
});

export const update = mutation({
  args: {
    entryId: v.id("contentEntries"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    draft: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    if (args.slug !== undefined && args.slug !== entry.slug) {
      const slugToCheck = args.slug;
      const existing = await ctx.db
        .query("contentEntries")
        .withIndex("by_slug", (q) =>
          q
            .eq("siteId", entry.siteId)
            .eq("contentTypeId", entry.contentTypeId)
            .eq("slug", slugToCheck),
        )
        .first();

      if (existing) {
        throw new ConvexError("An entry with this slug already exists");
      }
    }

    const fields: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: user._id,
    };
    if (args.title !== undefined) fields.title = args.title;
    if (args.slug !== undefined) fields.slug = args.slug;
    if (args.draft !== undefined) fields.draft = args.draft;

    await ctx.db.patch(args.entryId, fields);
  },
});

export const publish = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    const now = Date.now();

    await ctx.db.patch(args.entryId, {
      published: entry.draft,
      status: "published",
      publishedAt: now,
      publishedBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});

export const unpublish = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    await ctx.db.patch(args.entryId, {
      published: undefined,
      status: "draft",
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

export const remove = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);

    await ctx.db.delete(args.entryId);
  },
});

export const get = query({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);

    return entry;
  },
});

export const listByType = query({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    await requireSiteAccess(ctx, contentType.siteId);

    return await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    if (args.status !== undefined) {
      const statusFilter = args.status;
      return await ctx.db
        .query("contentEntries")
        .withIndex("by_status", (q) =>
          q.eq("siteId", args.siteId).eq("status", statusFilter),
        )
        .collect();
    }

    return await ctx.db
      .query("contentEntries")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

/**
 * Internal query: count entries by content type, grouped by status.
 * Used by the schema introspection HTTP API.
 */
export const countByTypeInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();

    const siteEntries = entries.filter((e) => e.siteId === args.siteId);
    return {
      published: siteEntries.filter((e) => e.status === "published").length,
      draft: siteEntries.filter((e) => e.status === "draft").length,
      total: siteEntries.length,
    };
  },
});

/**
 * Internal query: list published entries by content type.
 * Used by the HTTP API.
 */
export const listPublishedByType = internalQuery({
  args: {
    contentTypeId: v.id("contentTypes"),
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();

    return entries
      .filter((e) => e.status === "published")
      .map((e) => ({
        slug: e.slug,
        title: e.title,
        ...((e.published as Record<string, unknown>) ?? {}),
        _id: e._id,
        _createdAt: e.createdAt,
        _updatedAt: e.updatedAt,
        _publishedAt: e.publishedAt,
      }));
  },
});

/**
 * Internal query: get a single entry by slug.
 * Used by the HTTP API. Returns draft content if preview mode.
 */
export const getBySlugInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
    slug: v.string(),
    preview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("contentEntries")
      .withIndex("by_slug", (q) =>
        q
          .eq("siteId", args.siteId)
          .eq("contentTypeId", args.contentTypeId)
          .eq("slug", args.slug),
      )
      .first();

    if (!entry) {
      return null;
    }

    const content = args.preview
      ? (entry.draft as Record<string, unknown>)
      : (entry.published as Record<string, unknown> | undefined);

    if (!content && !args.preview) {
      return null;
    }

    return {
      slug: entry.slug,
      title: entry.title,
      ...(content ?? {}),
      _id: entry._id,
      _status: entry.status,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    };
  },
});
