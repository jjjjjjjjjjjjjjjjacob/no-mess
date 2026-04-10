import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// MIME types that should skip optimization
const SKIP_MIME_TYPES = new Set([
  "image/svg+xml",
  "image/gif", // GIFs may be animated — preserve as-is
]);

const BACKFILL_BATCH_SIZE = 10;

// === Internal Mutations ===

export const saveOptimizedResult = internalMutation({
  args: {
    assetId: v.id("assets"),
    optimizedStorageId: v.id("_storage"),
    optimizedUrl: v.string(),
    optimizedSize: v.number(),
    optimizedMimeType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assetId, {
      optimizedStorageId: args.optimizedStorageId,
      optimizedUrl: args.optimizedUrl,
      optimizedSize: args.optimizedSize,
      optimizedMimeType: args.optimizedMimeType,
      optimizationStatus: "completed" as const,
    });
  },
});

export const setOptimizationStatus = internalMutation({
  args: {
    assetId: v.id("assets"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assetId, {
      optimizationStatus: args.status,
    });
  },
});

export const saveVariant = internalMutation({
  args: {
    assetId: v.id("assets"),
    storageId: v.id("_storage"),
    url: v.string(),
    width: v.number(),
    height: v.number(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("assetVariants", {
      assetId: args.assetId,
      storageId: args.storageId,
      url: args.url,
      width: args.width,
      height: args.height,
      mimeType: args.mimeType,
      size: args.size,
      generatedAt: Date.now(),
    });
  },
});

export const deleteVariantsForAsset = internalMutation({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const variants = await ctx.db
      .query("assetVariants")
      .withIndex("by_asset", (q) => q.eq("assetId", args.assetId))
      .collect();

    for (const variant of variants) {
      await ctx.storage.delete(variant.storageId);
      await ctx.db.delete(variant._id);
    }
  },
});

// === Internal Queries ===

export const listUnoptimized = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allAssets = await ctx.db.query("assets").collect();
    return allAssets
      .filter(
        (asset) =>
          asset.optimizationStatus === undefined &&
          asset.mimeType.startsWith("image/") &&
          !SKIP_MIME_TYPES.has(asset.mimeType),
      )
      .slice(0, BACKFILL_BATCH_SIZE);
  },
});
