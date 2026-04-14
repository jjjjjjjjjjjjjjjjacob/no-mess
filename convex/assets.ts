import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { SKIP_OPTIMIZATION_MIME_TYPES } from "./imageConstants";
import { requireSiteAccess } from "./lib/access";
import { getCurrentUser } from "./lib/auth";

const DELETE_BATCH_SIZE = 25;

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

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
    // Delete responsive variants
    const variants = await ctx.db
      .query("assetVariants")
      .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
      .collect();

    const storageIds = [
      asset.storageId,
      asset.optimizedStorageId,
      ...variants.map((variant) => variant.storageId),
    ].filter((value): value is Id<"_storage"> => value !== undefined);
    const variantIds = variants.map((variant) => variant._id);

    for (const storageBatch of chunkValues(storageIds, DELETE_BATCH_SIZE)) {
      await Promise.all(
        storageBatch.map((storageId) => ctx.storage.delete(storageId)),
      );
    }

    for (const variantBatch of chunkValues(variantIds, DELETE_BATCH_SIZE)) {
      await Promise.all(
        variantBatch.map((variantId) => ctx.db.delete(variantId)),
      );
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
