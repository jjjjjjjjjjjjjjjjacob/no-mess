import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { getCurrentUser } from "./lib/auth";

const SKIP_OPTIMIZATION_MIME_TYPES = new Set(["image/svg+xml", "image/gif"]);

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    storageId: v.id("_storage"),
    checksum: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireSiteAccess(ctx, args.siteId);

    if (args.checksum) {
      const existingAsset = await ctx.db
        .query("assets")
        .withIndex("by_site_checksum", (q) =>
          q.eq("siteId", args.siteId).eq("checksum", args.checksum),
        )
        .first();

      if (existingAsset) {
        await ctx.storage.delete(args.storageId);
        return existingAsset._id;
      }
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError("Failed to get storage URL");
    }

    const isOptimizable =
      args.mimeType.startsWith("image/") &&
      !SKIP_OPTIMIZATION_MIME_TYPES.has(args.mimeType);

    const assetId = await ctx.db.insert("assets", {
      siteId: args.siteId,
      storageId: args.storageId,
      checksum: args.checksum,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      width: args.width,
      height: args.height,
      url,
      uploadedAt: Date.now(),
      uploadedBy: user._id,
      optimizationStatus: isOptimizable ? "pending" : "skipped",
    });

    if (isOptimizable) {
      await ctx.scheduler.runAfter(
        0,
        internal.imageOptimization.optimizeImage,
        { assetId },
      );
    }

    return assetId;
  },
});

export const findByChecksum = query({
  args: {
    siteId: v.id("sites"),
    checksum: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    return await ctx.db
      .query("assets")
      .withIndex("by_site_checksum", (q) =>
        q.eq("siteId", args.siteId).eq("checksum", args.checksum),
      )
      .first();
  },
});

export const remove = mutation({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new ConvexError("Asset not found");
    }

    await requireSiteAccess(ctx, asset.siteId);

    await ctx.storage.delete(asset.storageId);
    if (asset.optimizedStorageId) {
      await ctx.storage.delete(asset.optimizedStorageId);
    }
    // Delete responsive variants
    const variants = await ctx.db
      .query("assetVariants")
      .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
      .collect();
    for (const variant of variants) {
      await ctx.storage.delete(variant.storageId);
      await ctx.db.delete(variant._id);
    }
    await ctx.db.delete(args.assetId);
  },
});

export const get = query({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new ConvexError("Asset not found");
    }

    await requireSiteAccess(ctx, asset.siteId);

    return asset;
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const assets = await ctx.db
      .query("assets")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return assets.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
});

export const getInternal = internalQuery({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assetId);
  },
});
