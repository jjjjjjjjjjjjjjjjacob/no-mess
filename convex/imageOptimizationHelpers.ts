import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const BACKFILL_BATCH_SIZE = 10;
const IMAGE_MIME_TYPE_PREFIX = "image/";
const IMAGE_MIME_TYPE_PREFIX_UPPER_BOUND = "image0";
const SVG_MIME_TYPE = "image/svg+xml";
const GIF_MIME_TYPE = "image/gif";

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
      optimizationError: undefined,
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
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assetId, {
      optimizationStatus: args.status,
      optimizationError: args.status === "failed" ? args.error : undefined,
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
    return await ctx.db
      .query("assets")
      .withIndex("by_optimization_status", (q) =>
        q.eq("optimizationStatus", undefined),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("mimeType"), IMAGE_MIME_TYPE_PREFIX),
          q.lt(q.field("mimeType"), IMAGE_MIME_TYPE_PREFIX_UPPER_BOUND),
          q.neq(q.field("mimeType"), SVG_MIME_TYPE),
          q.neq(q.field("mimeType"), GIF_MIME_TYPE),
        ),
      )
      .take(BACKFILL_BATCH_SIZE);
  },
});
