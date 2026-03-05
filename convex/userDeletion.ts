import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Soft-deletes a user by setting deletedAt and scheduling permanent deletion
 * after 30 days. Idempotent: no-op if user not found or already soft-deleted.
 */
export const softDeleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user || user.deletedAt) return;

    const scheduledId = await ctx.scheduler.runAfter(
      THIRTY_DAYS_MS,
      internal.userDeletion.permanentlyDeleteUser,
      { userId: user._id },
    );

    await ctx.db.patch(user._id, {
      deletedAt: Date.now(),
      scheduledDeletionId: scheduledId,
    });
  },
});

/**
 * Permanently deletes a user and all their owned data after the retention
 * period. Aborts if the user has been restored (deletedAt cleared).
 */
export const permanentlyDeleteUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.deletedAt) return;

    // Cascade-delete all owned sites and their data
    const ownedSites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    for (const site of ownedSites) {
      // Delete content types
      const contentTypes = await ctx.db
        .query("contentTypes")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const ct of contentTypes) {
        await ctx.db.delete(ct._id);
      }

      // Delete content entries
      const contentEntries = await ctx.db
        .query("contentEntries")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const entry of contentEntries) {
        await ctx.db.delete(entry._id);
      }

      // Delete assets and their storage
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const asset of assets) {
        await ctx.storage.delete(asset.storageId);
        await ctx.db.delete(asset._id);
      }

      // Delete site access records
      const siteAccessRecords = await ctx.db
        .query("siteAccess")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const access of siteAccessRecords) {
        await ctx.db.delete(access._id);
      }

      // Delete shopify products
      const shopifyProducts = await ctx.db
        .query("shopifyProducts")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const product of shopifyProducts) {
        await ctx.db.delete(product._id);
      }

      // Delete shopify collections
      const shopifyCollections = await ctx.db
        .query("shopifyCollections")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const collection of shopifyCollections) {
        await ctx.db.delete(collection._id);
      }

      // Delete preview sessions
      const previewSessions = await ctx.db
        .query("previewSessions")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const session of previewSessions) {
        await ctx.db.delete(session._id);
      }

      // Delete shopify sync logs
      const syncLogs = await ctx.db
        .query("shopifySyncLogs")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();
      for (const log of syncLogs) {
        await ctx.db.delete(log._id);
      }

      // Delete the site itself
      await ctx.db.delete(site._id);
    }

    // Remove siteAccess records where this user is an editor on other sites
    const editorAccess = await ctx.db
      .query("siteAccess")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const access of editorAccess) {
      await ctx.db.delete(access._id);
    }

    // Delete the user record
    await ctx.db.delete(args.userId);
  },
});
