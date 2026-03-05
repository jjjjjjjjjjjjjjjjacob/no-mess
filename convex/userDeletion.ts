import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 100;

/**
 * Tables containing per-site data, cleaned in order during site deletion.
 * Every table listed here must have a `by_site` index on `siteId`.
 */
const SITE_CLEANUP_TABLES = [
  "contentTypes",
  "contentEntries",
  "assets",
  "siteAccess",
  "shopifyProducts",
  "shopifyCollections",
  "previewSessions",
  "shopifySyncLogs",
] as const;

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
 *
 * Instead of deleting everything in one mutation, schedules batched cleanup
 * jobs per site and a separate job for user-level records.
 */
export const permanentlyDeleteUser = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.deletedAt) return;

    // Schedule batched cleanup for each owned site
    const ownedSites = await ctx.db
      .query("sites")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();

    for (const site of ownedSites) {
      await ctx.scheduler.runAfter(0, internal.userDeletion.deleteSiteData, {
        siteId: site._id,
        tableIndex: 0,
      });
    }

    // Schedule user-level cleanup (editor access records + user deletion)
    await ctx.scheduler.runAfter(0, internal.userDeletion.cleanupUserRecords, {
      userId: args.userId,
    });
  },
});

/**
 * Deletes per-site data one table at a time in batches of BATCH_SIZE.
 * Reschedules itself until the current table is empty, then advances to the
 * next. Once all tables are cleaned, deletes the site record.
 */
export const deleteSiteData = internalMutation({
  args: {
    siteId: v.id("sites"),
    tableIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const { siteId, tableIndex } = args;

    // All tables cleaned — delete the site itself
    if (tableIndex >= SITE_CLEANUP_TABLES.length) {
      const site = await ctx.db.get(siteId);
      if (site) await ctx.db.delete(siteId);
      return;
    }

    const table = SITE_CLEANUP_TABLES[tableIndex];

    // biome-ignore lint/suspicious/noExplicitAny: internal deletion across typed tables with shared by_site index
    const records = await (ctx.db as any)
      .query(table)
      // biome-ignore lint/suspicious/noExplicitAny: dynamic table index callback
      .withIndex("by_site", (q: any) => q.eq("siteId", siteId))
      .take(BATCH_SIZE);

    for (const record of records) {
      if (table === "assets" && record.storageId) {
        await ctx.storage.delete(record.storageId);
      }
      await ctx.db.delete(record._id);
    }

    if (records.length >= BATCH_SIZE) {
      // More records may exist in this table — continue
      await ctx.scheduler.runAfter(0, internal.userDeletion.deleteSiteData, {
        siteId,
        tableIndex,
      });
    } else {
      // This table is done — advance to the next
      await ctx.scheduler.runAfter(0, internal.userDeletion.deleteSiteData, {
        siteId,
        tableIndex: tableIndex + 1,
      });
    }
  },
});

/**
 * Cleans up user-level records (editor access on other users' sites) in
 * batches, then deletes the user record once all are removed.
 */
export const cleanupUserRecords = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db
      .query("siteAccess")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(BATCH_SIZE);

    for (const access of batch) {
      await ctx.db.delete(access._id);
    }

    if (batch.length >= BATCH_SIZE) {
      // More records may exist — continue
      await ctx.scheduler.runAfter(
        0,
        internal.userDeletion.cleanupUserRecords,
        { userId: args.userId },
      );
      return;
    }

    // All access records cleaned — delete the user
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.delete(args.userId);
    }
  },
});
