import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireSiteAccess, requireSiteOwner } from "./lib/access";
import { getCurrentUser, getCurrentUserOrNull } from "./lib/auth";
import {
  generateApiKey,
  generatePreviewSecret,
  generatePublishableKey,
} from "./lib/utils";

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = await ctx.db
      .query("sites")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("A site with this slug already exists");
    }

    const apiKey = generateApiKey();
    const publishableKey = generatePublishableKey();
    const previewSecret = generatePreviewSecret();

    const siteId = await ctx.db.insert("sites", {
      ownerId: user._id,
      name: args.name,
      slug: args.slug,
      apiKey,
      publishableKey,
      previewSecret,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return siteId;
  },
});

export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    shopifyDomain: v.optional(v.string()),
    shopifyToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    if (args.slug !== undefined) {
      const slugToCheck = args.slug;
      const existing = await ctx.db
        .query("sites")
        .withIndex("by_slug", (q) => q.eq("slug", slugToCheck))
        .first();

      if (existing && existing._id !== args.siteId) {
        throw new ConvexError("A site with this slug already exists");
      }
    }

    const fields: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) fields.name = args.name;
    if (args.slug !== undefined) fields.slug = args.slug;
    if (args.previewUrl !== undefined) fields.previewUrl = args.previewUrl;
    if (args.shopifyDomain !== undefined)
      fields.shopifyDomain = args.shopifyDomain;
    if (args.shopifyToken !== undefined)
      fields.shopifyToken = args.shopifyToken;

    await ctx.db.patch(args.siteId, fields);
  },
});

export const remove = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    // Delete content types
    const contentTypes = await ctx.db
      .query("contentTypes")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const ct of contentTypes) {
      await ctx.db.delete(ct._id);
    }

    // Delete content entries
    const contentEntries = await ctx.db
      .query("contentEntries")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const entry of contentEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete assets and their storage
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const asset of assets) {
      await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }

    // Delete site access records
    const siteAccessRecords = await ctx.db
      .query("siteAccess")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const access of siteAccessRecords) {
      await ctx.db.delete(access._id);
    }

    // Delete shopify products
    const shopifyProducts = await ctx.db
      .query("shopifyProducts")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const product of shopifyProducts) {
      await ctx.db.delete(product._id);
    }

    // Delete shopify collections
    const shopifyCollections = await ctx.db
      .query("shopifyCollections")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
    for (const collection of shopifyCollections) {
      await ctx.db.delete(collection._id);
    }

    // Delete the site itself
    await ctx.db.delete(args.siteId);
  },
});

export const regenerateApiKey = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    const apiKey = generateApiKey();
    await ctx.db.patch(args.siteId, { apiKey, updatedAt: Date.now() });
  },
});

export const regeneratePreviewSecret = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    const previewSecret = generatePreviewSecret();
    await ctx.db.patch(args.siteId, { previewSecret, updatedAt: Date.now() });
  },
});

export const regeneratePublishableKey = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    const publishableKey = generatePublishableKey();
    await ctx.db.patch(args.siteId, { publishableKey, updatedAt: Date.now() });
  },
});

export const get = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const { site } = await requireSiteAccess(ctx, args.siteId);
    return site;
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!site) {
      return null;
    }

    const user = await getCurrentUser(ctx);

    if (site.ownerId === user._id) {
      return site;
    }

    const access = await ctx.db
      .query("siteAccess")
      .withIndex("by_site_user", (q) =>
        q.eq("siteId", site._id).eq("userId", user._id),
      )
      .first();

    if (!access) {
      return null;
    }

    return site;
  },
});

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    // Get sites owned by user
    const ownedSites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    // Get sites the user has access to via siteAccess
    const accessRecords = await ctx.db
      .query("siteAccess")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const ownedSiteIds = new Set(ownedSites.map((s) => s._id));
    const sharedSites = [];

    for (const record of accessRecords) {
      if (!ownedSiteIds.has(record.siteId)) {
        const site = await ctx.db.get(record.siteId);
        if (site) {
          sharedSites.push(site);
        }
      }
    }

    return [...ownedSites, ...sharedSites];
  },
});

/**
 * Internal query to get a site by its API key (secret key).
 * Used by the HTTP API for authentication.
 */
export const getByApiKey = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sites")
      .withIndex("by_api_key", (q) => q.eq("apiKey", args.apiKey))
      .first();
  },
});

/**
 * Internal query to get a site by its publishable key.
 * Used by the HTTP API for client-side authentication.
 */
export const getByPublishableKey = internalQuery({
  args: {
    publishableKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sites")
      .withIndex("by_publishable_key", (q) =>
        q.eq("publishableKey", args.publishableKey),
      )
      .first();
  },
});

/**
 * Backfill publishable keys for existing sites that don't have one.
 */
export const backfillPublishableKeys = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sites = await ctx.db.query("sites").collect();
    let updated = 0;
    for (const site of sites) {
      if (!site.publishableKey) {
        await ctx.db.patch(site._id, {
          publishableKey: generatePublishableKey(),
        });
        updated++;
      }
    }
    return { updated };
  },
});
