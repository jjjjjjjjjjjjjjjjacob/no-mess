import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { getCurrentUser } from "./lib/auth";

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
    });

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
