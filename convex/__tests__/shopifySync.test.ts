import { vi } from "vitest";
import {
  createMockActionCtx,
  createMockMutationCtx,
  createMockQueryCtx,
} from "./helpers/mockCtx";

vi.mock("../lib/shopify", () => ({
  fetchProducts: vi.fn(),
  fetchCollections: vi.fn(),
}));

vi.mock("../_generated/api", () => ({
  internal: {
    shopifySync: {
      syncSiteWorker: "internal:shopifySync:syncSiteWorker",
      updateSyncLog: "internal:shopifySync:updateSyncLog",
      completeSyncLog: "internal:shopifySync:completeSyncLog",
      dispatchSyncCycle: "internal:shopifySync:dispatchSyncCycle",
    },
    shopify: {
      getSiteForSync: "internal:shopify:getSiteForSync",
      upsertProduct: "internal:shopify:upsertProduct",
      upsertCollection: "internal:shopify:upsertCollection",
      updateSyncTimestamp: "internal:shopify:updateSyncTimestamp",
    },
  },
}));

import { fetchCollections, fetchProducts } from "../lib/shopify";

const mockFetchProducts = vi.mocked(fetchProducts);
const mockFetchCollections = vi.mocked(fetchCollections);

import * as shopifySync from "../shopifySync";

function getHandler(fn: any) {
  return fn._handler;
}

// === Test data ===

const makeSite = (
  id: string,
  opts: { shopify?: boolean; domain?: string; token?: string } = {},
) => ({
  _id: id as any,
  _creationTime: 1000,
  ownerId: "user_1",
  name: `Site ${id}`,
  slug: `site-${id}`,
  apiKey: `api_${id}`,
  previewSecret: `secret_${id}`,
  createdAt: 1000,
  updatedAt: 1000,
  ...(opts.shopify !== false
    ? {
        shopifyDomain: opts.domain ?? "myshop.myshopify.com",
        shopifyToken: opts.token ?? "shpat_token123",
      }
    : {}),
});

const makeRunningCycle = (id: string, startedAt: number, totalSites = 1) => ({
  _id: id as any,
  _creationTime: startedAt,
  status: "running" as const,
  trigger: "cron" as const,
  totalSites,
  completedSites: 0,
  failedSites: 0,
  startedAt,
});

// === dispatchSyncCycle ===

describe("shopifySync.dispatchSyncCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when a cycle is still actively running", async () => {
    const ctx = createMockMutationCtx();
    const recentCycle = makeRunningCycle("cycle_1", Date.now() - 60_000); // 1 min ago

    // First query: running cycles
    ctx._mocks.collect
      .mockResolvedValueOnce([recentCycle]) // running cycles
      .mockResolvedValueOnce([]); // sites (shouldn't be reached)

    const handler = getHandler(shopifySync.dispatchSyncCycle);
    await handler(ctx, {});

    // Should insert a "skipped" cycle
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncCycles",
      expect.objectContaining({ status: "skipped" }),
    );
    // Should NOT schedule any workers
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it("force-closes stale running cycles (>3h) and proceeds", async () => {
    const ctx = createMockMutationCtx();
    const staleStart = Date.now() - 4 * 60 * 60 * 1000; // 4h ago
    const staleCycle = makeRunningCycle("cycle_stale", staleStart);

    const site = makeSite("s1");

    ctx._mocks.collect
      .mockResolvedValueOnce([staleCycle]) // running cycles
      .mockResolvedValueOnce([site]); // all sites

    // insert returns cycle id first, then log id
    ctx.db.insert
      .mockResolvedValueOnce("cycle_new") // cycle insert
      .mockResolvedValueOnce("log_1"); // log insert

    const handler = getHandler(shopifySync.dispatchSyncCycle);
    await handler(ctx, {});

    // Should patch the stale cycle as completed_with_errors
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "cycle_stale",
      expect.objectContaining({ status: "completed_with_errors" }),
    );

    // Should create a new running cycle
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncCycles",
      expect.objectContaining({ status: "running", totalSites: 1 }),
    );

    // Should schedule a worker
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
  });

  it("handles zero Shopify-connected sites", async () => {
    const ctx = createMockMutationCtx();
    const siteNoShopify = makeSite("s1", { shopify: false });

    ctx._mocks.collect
      .mockResolvedValueOnce([]) // no running cycles
      .mockResolvedValueOnce([siteNoShopify]); // sites without Shopify

    const handler = getHandler(shopifySync.dispatchSyncCycle);
    await handler(ctx, {});

    // Should insert a completed cycle with totalSites: 0
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncCycles",
      expect.objectContaining({
        status: "completed",
        totalSites: 0,
      }),
    );
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });

  it("creates cycle + logs and schedules workers with staggered delays", async () => {
    const ctx = createMockMutationCtx();
    const sites = [
      makeSite("s1"),
      makeSite("s2"),
      makeSite("s3"),
      makeSite("s4"),
      makeSite("s5"),
      makeSite("s6"), // 6th site = 2nd batch
    ];

    ctx._mocks.collect
      .mockResolvedValueOnce([]) // no running cycles
      .mockResolvedValueOnce(sites); // all sites

    // insert returns: cycle_id, then log_1..log_6
    ctx.db.insert
      .mockResolvedValueOnce("cycle_1")
      .mockResolvedValueOnce("log_1")
      .mockResolvedValueOnce("log_2")
      .mockResolvedValueOnce("log_3")
      .mockResolvedValueOnce("log_4")
      .mockResolvedValueOnce("log_5")
      .mockResolvedValueOnce("log_6");

    const handler = getHandler(shopifySync.dispatchSyncCycle);
    await handler(ctx, {});

    // Cycle record
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncCycles",
      expect.objectContaining({ status: "running", totalSites: 6 }),
    );

    // 6 log records
    const logInserts = ctx.db.insert.mock.calls.filter(
      (c: any[]) => c[0] === "shopifySyncLogs",
    );
    expect(logInserts).toHaveLength(6);

    // 6 scheduled workers
    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(6);

    // Check stagger delays for first batch (indices 0-4): 0, 2000, 4000, 6000, 8000
    const delays = ctx.scheduler.runAfter.mock.calls.map((c: any[]) => c[0]);
    expect(delays[0]).toBe(0); // batch 0, position 0
    expect(delays[1]).toBe(2000); // batch 0, position 1
    expect(delays[2]).toBe(4000); // batch 0, position 2
    expect(delays[3]).toBe(6000); // batch 0, position 3
    expect(delays[4]).toBe(8000); // batch 0, position 4
    expect(delays[5]).toBe(30000); // batch 1, position 0

    // All workers reference correct function
    for (const call of ctx.scheduler.runAfter.mock.calls) {
      expect(call[1]).toBe("internal:shopifySync:syncSiteWorker");
    }
  });
});

// === syncSiteWorker ===

describe("shopifySync.syncSiteWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds and records correct product/collection counts", async () => {
    const ctx = createMockActionCtx();
    const site = makeSite("s1");

    // runQuery: getSiteForSync returns site
    ctx.runQuery.mockResolvedValue(site);
    ctx.runMutation.mockResolvedValue(undefined);

    const mockProducts = [
      {
        id: "gid://shopify/Product/1",
        handle: "product-a",
        title: "Product A",
        productType: "T-Shirt",
        vendor: "Brand",
        tags: ["tag1"],
        availableForSale: true,
        featuredImage: { url: "https://img.com/a.jpg", altText: null },
        images: { edges: [] },
        variants: {
          edges: [
            {
              node: {
                id: "v1",
                title: "Default",
                sku: null,
                availableForSale: true,
                price: { amount: "29.99", currencyCode: "USD" },
                compareAtPrice: null,
              },
            },
          ],
        },
        priceRange: {
          minVariantPrice: { amount: "29.99", currencyCode: "USD" },
          maxVariantPrice: { amount: "29.99", currencyCode: "USD" },
        },
      },
    ];

    const mockCollections = [
      {
        id: "gid://shopify/Collection/1",
        handle: "spring",
        title: "Spring",
        image: null,
      },
    ];

    mockFetchProducts.mockResolvedValue(mockProducts as any);
    mockFetchCollections.mockResolvedValue(mockCollections as any);

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s1",
      retryCount: 0,
    });

    // Should call updateSyncLog with "running"
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:updateSyncLog",
      expect.objectContaining({ logId: "log_1", status: "running" }),
    );

    // Should call upsertProduct
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:upsertProduct",
      expect.objectContaining({
        siteId: "s1",
        shopifyId: "gid://shopify/Product/1",
      }),
    );

    // Should call upsertCollection
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:upsertCollection",
      expect.objectContaining({
        siteId: "s1",
        shopifyId: "gid://shopify/Collection/1",
      }),
    );

    // Should call updateSyncTimestamp
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:updateSyncTimestamp",
      { siteId: "s1" },
    );

    // Should call completeSyncLog with correct counts
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:completeSyncLog",
      expect.objectContaining({
        cycleId: "cycle_1",
        logId: "log_1",
        status: "completed",
        productsCount: 1,
        collectionsCount: 1,
      }),
    );
  });

  it("handles missing site / removed credentials gracefully", async () => {
    const ctx = createMockActionCtx();
    ctx.runQuery.mockResolvedValue(null); // site not found
    ctx.runMutation.mockResolvedValue(undefined);

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s_missing",
      retryCount: 0,
    });

    // Should mark as failed
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:completeSyncLog",
      expect.objectContaining({
        status: "failed",
        error: "Site not found or Shopify credentials removed",
      }),
    );
  });

  it("handles site with removed Shopify credentials", async () => {
    const ctx = createMockActionCtx();
    const siteNoShopify = makeSite("s1", { shopify: false });
    ctx.runQuery.mockResolvedValue(siteNoShopify);
    ctx.runMutation.mockResolvedValue(undefined);

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s1",
      retryCount: 0,
    });

    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:completeSyncLog",
      expect.objectContaining({
        status: "failed",
        error: "Site not found or Shopify credentials removed",
      }),
    );
  });

  it("retries on error with exponential backoff", async () => {
    const ctx = createMockActionCtx();
    const site = makeSite("s1");
    ctx.runQuery.mockResolvedValue(site);
    ctx.runMutation.mockResolvedValue(undefined);

    mockFetchProducts.mockRejectedValue(new Error("Shopify API error 429"));

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s1",
      retryCount: 0,
    });

    // Should update log back to pending with retry count
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:updateSyncLog",
      expect.objectContaining({
        logId: "log_1",
        status: "pending",
        retryCount: 1,
        error: "Shopify API error 429",
      }),
    );

    // Should schedule retry with 1 minute delay
    expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
      60_000,
      "internal:shopifySync:syncSiteWorker",
      expect.objectContaining({
        cycleId: "cycle_1",
        logId: "log_1",
        siteId: "s1",
        retryCount: 1,
      }),
    );
  });

  it("retries with 2m delay on second retry", async () => {
    const ctx = createMockActionCtx();
    const site = makeSite("s1");
    ctx.runQuery.mockResolvedValue(site);
    ctx.runMutation.mockResolvedValue(undefined);

    mockFetchProducts.mockRejectedValue(new Error("Rate limited"));

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s1",
      retryCount: 1, // already retried once
    });

    // Should schedule with 2 minute delay
    expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
      120_000,
      "internal:shopifySync:syncSiteWorker",
      expect.objectContaining({ retryCount: 2 }),
    );
  });

  it("permanently fails after MAX_RETRIES", async () => {
    const ctx = createMockActionCtx();
    const site = makeSite("s1");
    ctx.runQuery.mockResolvedValue(site);
    ctx.runMutation.mockResolvedValue(undefined);

    mockFetchProducts.mockRejectedValue(new Error("Persistent failure"));

    const handler = getHandler(shopifySync.syncSiteWorker);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      siteId: "s1",
      retryCount: 2, // MAX_RETRIES reached
    });

    // Should NOT schedule another retry
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();

    // Should mark as permanently failed
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopifySync:completeSyncLog",
      expect.objectContaining({
        status: "failed",
        error: "Persistent failure",
      }),
    );
  });
});

// === completeSyncLog ===

describe("shopifySync.completeSyncLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments completedSites and finalizes cycle when all done", async () => {
    const ctx = createMockMutationCtx();
    const cycle = {
      _id: "cycle_1",
      status: "running",
      totalSites: 2,
      completedSites: 1,
      failedSites: 0,
    };
    ctx.db.get.mockResolvedValue(cycle);

    const handler = getHandler(shopifySync.completeSyncLog);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      status: "completed",
      productsCount: 5,
      collectionsCount: 2,
      durationMs: 3000,
    });

    // Should patch the log
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "log_1",
      expect.objectContaining({
        status: "completed",
        productsCount: 5,
        collectionsCount: 2,
        durationMs: 3000,
      }),
    );

    // Should finalize cycle (2/2 completed)
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "cycle_1",
      expect.objectContaining({
        completedSites: 2,
        failedSites: 0,
        status: "completed",
      }),
    );
  });

  it("sets completed_with_errors when there are failures", async () => {
    const ctx = createMockMutationCtx();
    const cycle = {
      _id: "cycle_1",
      status: "running",
      totalSites: 2,
      completedSites: 1,
      failedSites: 0,
    };
    ctx.db.get.mockResolvedValue(cycle);

    const handler = getHandler(shopifySync.completeSyncLog);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_2",
      status: "failed",
      error: "Connection timeout",
      durationMs: 5000,
    });

    // Should set status to completed_with_errors
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "cycle_1",
      expect.objectContaining({
        completedSites: 1,
        failedSites: 1,
        status: "completed_with_errors",
      }),
    );
  });

  it("does not finalize cycle when more sites remain", async () => {
    const ctx = createMockMutationCtx();
    const cycle = {
      _id: "cycle_1",
      status: "running",
      totalSites: 3,
      completedSites: 0,
      failedSites: 0,
    };
    ctx.db.get.mockResolvedValue(cycle);

    const handler = getHandler(shopifySync.completeSyncLog);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      status: "completed",
      productsCount: 3,
      collectionsCount: 1,
      durationMs: 2000,
    });

    // Should update counters but NOT set cycle status
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "cycle_1",
      expect.objectContaining({ completedSites: 1 }),
    );
    const cyclePatch = ctx.db.patch.mock.calls.find(
      (c: any[]) => c[0] === "cycle_1",
    )?.[1] as Record<string, unknown>;
    expect(cyclePatch.status).toBeUndefined();
  });

  it("skips cycle update if cycle is not running", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue({
      _id: "cycle_1",
      status: "completed",
      totalSites: 1,
      completedSites: 1,
      failedSites: 0,
    });

    const handler = getHandler(shopifySync.completeSyncLog);
    await handler(ctx, {
      cycleId: "cycle_1",
      logId: "log_1",
      status: "completed",
      durationMs: 1000,
    });

    // Should still patch the log
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "log_1",
      expect.objectContaining({ status: "completed" }),
    );

    // Should NOT patch the cycle (already completed)
    const cyclePatchCalls = ctx.db.patch.mock.calls.filter(
      (c: any[]) => c[0] === "cycle_1",
    );
    expect(cyclePatchCalls).toHaveLength(0);
  });
});

// === updateSyncLog ===

describe("shopifySync.updateSyncLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches log status", async () => {
    const ctx = createMockMutationCtx();

    const handler = getHandler(shopifySync.updateSyncLog);
    await handler(ctx, { logId: "log_1", status: "running" });

    expect(ctx.db.patch).toHaveBeenCalledWith("log_1", { status: "running" });
  });

  it("patches log with retryCount and error", async () => {
    const ctx = createMockMutationCtx();

    const handler = getHandler(shopifySync.updateSyncLog);
    await handler(ctx, {
      logId: "log_1",
      status: "pending",
      retryCount: 1,
      error: "Timeout",
    });

    expect(ctx.db.patch).toHaveBeenCalledWith("log_1", {
      status: "pending",
      retryCount: 1,
      error: "Timeout",
    });
  });
});

// === triggerManualSync ===

describe("shopifySync.triggerManualSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a single-site cycle and schedules immediately", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.insert
      .mockResolvedValueOnce("cycle_m1") // cycle
      .mockResolvedValueOnce("log_m1"); // log

    const handler = getHandler(shopifySync.triggerManualSync);
    const result = await handler(ctx, { siteId: "s1" });

    expect(result).toEqual({ cycleId: "cycle_m1", logId: "log_m1" });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncCycles",
      expect.objectContaining({
        status: "running",
        trigger: "manual",
        totalSites: 1,
      }),
    );

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifySyncLogs",
      expect.objectContaining({
        cycleId: "cycle_m1",
        siteId: "s1",
        status: "pending",
      }),
    );

    // Scheduled immediately (delay 0)
    expect(ctx.scheduler.runAfter).toHaveBeenCalledWith(
      0,
      "internal:shopifySync:syncSiteWorker",
      expect.objectContaining({
        cycleId: "cycle_m1",
        logId: "log_m1",
        siteId: "s1",
        retryCount: 0,
      }),
    );
  });
});

// === Observability queries ===

describe("shopifySync.listRecentCycles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries with by_started_at index and desc order", async () => {
    const ctx = createMockQueryCtx();
    const takeFn = vi.fn().mockResolvedValue([]);
    const orderFn = vi.fn().mockReturnValue({ take: takeFn });
    ctx._mocks.withIndex.mockReturnValue({ order: orderFn });

    const handler = getHandler(shopifySync.listRecentCycles);
    await handler(ctx, {});

    expect(ctx.db.query).toHaveBeenCalledWith("shopifySyncCycles");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith("by_started_at");
    expect(orderFn).toHaveBeenCalledWith("desc");
    expect(takeFn).toHaveBeenCalledWith(10);
  });

  it("uses custom limit", async () => {
    const ctx = createMockQueryCtx();
    const takeFn = vi.fn().mockResolvedValue([]);
    const orderFn = vi.fn().mockReturnValue({ take: takeFn });
    ctx._mocks.withIndex.mockReturnValue({ order: orderFn });

    const handler = getHandler(shopifySync.listRecentCycles);
    await handler(ctx, { limit: 5 });

    expect(takeFn).toHaveBeenCalledWith(5);
  });
});

describe("shopifySync.getLogsForCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries logs by cycle index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(shopifySync.getLogsForCycle);
    await handler(ctx, { cycleId: "cycle_1" });

    expect(ctx.db.query).toHaveBeenCalledWith("shopifySyncLogs");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_cycle",
      expect.any(Function),
    );
  });
});

describe("shopifySync.getLatestSyncForSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries logs by site index with desc order", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.order.mockReturnValue({ first: ctx._mocks.first });

    const handler = getHandler(shopifySync.getLatestSyncForSite);
    await handler(ctx, { siteId: "s1" });

    expect(ctx.db.query).toHaveBeenCalledWith("shopifySyncLogs");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
    expect(ctx._mocks.order).toHaveBeenCalledWith("desc");
  });
});
