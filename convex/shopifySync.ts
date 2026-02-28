import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { fetchCollections, fetchProducts } from "./lib/shopify";

// === Constants ===

const BATCH_SIZE = 5;
const STAGGER_DELAY_MS = 30_000;
const PER_SITE_OFFSET_MS = 2_000;
const MAX_RETRIES = 2;
const MAX_CYCLE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

// === Dispatcher (cron entry point) ===

export const dispatchSyncCycle = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check for stale running cycles and force-close them
    const runningCycles = await ctx.db
      .query("shopifySyncCycles")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    const now = Date.now();

    for (const cycle of runningCycles) {
      if (now - cycle.startedAt > MAX_CYCLE_DURATION_MS) {
        await ctx.db.patch(cycle._id, {
          status: "completed_with_errors",
          completedAt: now,
        });
      } else {
        // A cycle is still actively running within the safety window — skip
        await ctx.db.insert("shopifySyncCycles", {
          status: "skipped",
          trigger: "cron",
          totalSites: 0,
          completedSites: 0,
          failedSites: 0,
          startedAt: now,
          completedAt: now,
        });
        return;
      }
    }

    // Query all sites with Shopify credentials
    const allSites = await ctx.db.query("sites").collect();
    const shopifySites = allSites.filter(
      (s) => s.shopifyDomain && s.shopifyToken,
    );

    if (shopifySites.length === 0) {
      await ctx.db.insert("shopifySyncCycles", {
        status: "completed",
        trigger: "cron",
        totalSites: 0,
        completedSites: 0,
        failedSites: 0,
        startedAt: now,
        completedAt: now,
      });
      return;
    }

    // Create cycle record
    const cycleId = await ctx.db.insert("shopifySyncCycles", {
      status: "running",
      trigger: "cron",
      totalSites: shopifySites.length,
      completedSites: 0,
      failedSites: 0,
      startedAt: now,
    });

    // Create logs and schedule workers with staggered delays
    for (let i = 0; i < shopifySites.length; i++) {
      const site = shopifySites[i];
      const batchIndex = Math.floor(i / BATCH_SIZE);
      const positionInBatch = i % BATCH_SIZE;
      const delay =
        batchIndex * STAGGER_DELAY_MS + positionInBatch * PER_SITE_OFFSET_MS;

      const logId = await ctx.db.insert("shopifySyncLogs", {
        cycleId,
        siteId: site._id,
        status: "pending",
        startedAt: now,
        retryCount: 0,
      });

      await ctx.scheduler.runAfter(delay, internal.shopifySync.syncSiteWorker, {
        cycleId,
        logId,
        siteId: site._id,
        retryCount: 0,
      });
    }
  },
});

// === Worker (syncs one site) ===

export const syncSiteWorker = internalAction({
  args: {
    cycleId: v.id("shopifySyncCycles"),
    logId: v.id("shopifySyncLogs"),
    siteId: v.id("sites"),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    // Mark log as running
    await ctx.runMutation(internal.shopifySync.updateSyncLog, {
      logId: args.logId,
      status: "running",
      retryCount: args.retryCount,
    });

    // Get site credentials
    const site = await ctx.runQuery(internal.shopify.getSiteForSync, {
      siteId: args.siteId,
    });

    if (!site || !site.shopifyDomain || !site.shopifyToken) {
      await ctx.runMutation(internal.shopifySync.completeSyncLog, {
        cycleId: args.cycleId,
        logId: args.logId,
        status: "failed",
        error: "Site not found or Shopify credentials removed",
        durationMs: Date.now() - startTime,
      });
      return;
    }

    try {
      // Fetch products from Shopify
      const products = await fetchProducts(
        site.shopifyDomain,
        site.shopifyToken,
      );

      // Upsert each product (duplicated mapping from shopify.ts to avoid modifying it)
      for (const product of products) {
        await ctx.runMutation(internal.shopify.upsertProduct, {
          siteId: args.siteId,
          shopifyId: product.id,
          handle: product.handle,
          title: product.title,
          status: "active",
          featuredImage: product.featuredImage?.url,
          images: product.images.edges.map((e) => ({
            id: e.node.id,
            src: e.node.url,
            alt: e.node.altText ?? undefined,
          })),
          variants: product.variants.edges.map((e) => ({
            id: e.node.id,
            title: e.node.title,
            sku: e.node.sku || undefined,
            price: e.node.price.amount,
            compareAtPrice: e.node.compareAtPrice?.amount || undefined,
            available: e.node.availableForSale,
          })),
          productType: product.productType || undefined,
          vendor: product.vendor || undefined,
          tags: product.tags,
          priceRange: {
            min: product.priceRange.minVariantPrice.amount,
            max: product.priceRange.maxVariantPrice.amount,
          },
        });
      }

      // Fetch collections from Shopify
      const collections = await fetchCollections(
        site.shopifyDomain,
        site.shopifyToken,
      );

      // Upsert each collection
      for (const collection of collections) {
        await ctx.runMutation(internal.shopify.upsertCollection, {
          siteId: args.siteId,
          shopifyId: collection.id,
          handle: collection.handle,
          title: collection.title,
          image: collection.image?.url,
          productsCount: 0,
        });
      }

      // Update sync timestamp
      await ctx.runMutation(internal.shopify.updateSyncTimestamp, {
        siteId: args.siteId,
      });

      // Mark complete
      await ctx.runMutation(internal.shopifySync.completeSyncLog, {
        cycleId: args.cycleId,
        logId: args.logId,
        status: "completed",
        productsCount: products.length,
        collectionsCount: collections.length,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (args.retryCount < MAX_RETRIES) {
        // Schedule retry with exponential backoff: 1m, 2m
        const backoffMs = (args.retryCount + 1) * 60_000;

        await ctx.runMutation(internal.shopifySync.updateSyncLog, {
          logId: args.logId,
          status: "pending",
          retryCount: args.retryCount + 1,
          error: errorMessage,
        });

        await ctx.scheduler.runAfter(
          backoffMs,
          internal.shopifySync.syncSiteWorker,
          {
            cycleId: args.cycleId,
            logId: args.logId,
            siteId: args.siteId,
            retryCount: args.retryCount + 1,
          },
        );
      } else {
        // Permanently failed after MAX_RETRIES
        await ctx.runMutation(internal.shopifySync.completeSyncLog, {
          cycleId: args.cycleId,
          logId: args.logId,
          status: "failed",
          error: errorMessage,
          durationMs: Date.now() - startTime,
        });
      }
    }
  },
});

// === Log management ===

export const updateSyncLog = internalMutation({
  args: {
    logId: v.id("shopifySyncLogs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    retryCount: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status };
    if (args.retryCount !== undefined) {
      patch.retryCount = args.retryCount;
    }
    if (args.error !== undefined) {
      patch.error = args.error;
    }
    await ctx.db.patch(args.logId, patch);
  },
});

export const completeSyncLog = internalMutation({
  args: {
    cycleId: v.id("shopifySyncCycles"),
    logId: v.id("shopifySyncLogs"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    productsCount: v.optional(v.number()),
    collectionsCount: v.optional(v.number()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Update the log entry
    await ctx.db.patch(args.logId, {
      status: args.status,
      productsCount: args.productsCount,
      collectionsCount: args.collectionsCount,
      error: args.error,
      durationMs: args.durationMs,
      completedAt: now,
    });

    // Increment cycle counters
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle || cycle.status !== "running") return;

    const updatedCompleted =
      args.status === "completed"
        ? cycle.completedSites + 1
        : cycle.completedSites;
    const updatedFailed =
      args.status === "failed" ? cycle.failedSites + 1 : cycle.failedSites;
    const totalDone = updatedCompleted + updatedFailed;

    const cyclePatch: Record<string, unknown> = {
      completedSites: updatedCompleted,
      failedSites: updatedFailed,
    };

    // Finalize cycle when all sites are done
    if (totalDone >= cycle.totalSites) {
      cyclePatch.status =
        updatedFailed > 0 ? "completed_with_errors" : "completed";
      cyclePatch.completedAt = now;
    }

    await ctx.db.patch(args.cycleId, cyclePatch);
  },
});

// === Observability queries ===

export const listRecentCycles = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("shopifySyncCycles")
      .withIndex("by_started_at")
      .order("desc")
      .take(limit);
  },
});

export const getLogsForCycle = internalQuery({
  args: { cycleId: v.id("shopifySyncCycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopifySyncLogs")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
  },
});

export const getLatestSyncForSite = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopifySyncLogs")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .order("desc")
      .first();
  },
});

// === Manual trigger ===

export const triggerManualSync = internalMutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const now = Date.now();

    const cycleId = await ctx.db.insert("shopifySyncCycles", {
      status: "running",
      trigger: "manual",
      totalSites: 1,
      completedSites: 0,
      failedSites: 0,
      startedAt: now,
    });

    const logId = await ctx.db.insert("shopifySyncLogs", {
      cycleId,
      siteId: args.siteId,
      status: "pending",
      startedAt: now,
      retryCount: 0,
    });

    await ctx.scheduler.runAfter(0, internal.shopifySync.syncSiteWorker, {
      cycleId,
      logId,
      siteId: args.siteId,
      retryCount: 0,
    });

    return { cycleId, logId };
  },
});
