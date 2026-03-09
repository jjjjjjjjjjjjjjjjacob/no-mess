import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
}));

import * as contentEntryRoutes from "../contentEntryRoutes";
import { requireSiteAccess } from "../lib/access";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);

function getHandler(fn: any) {
  return fn._handler;
}

const mockSite = {
  _id: "site_1" as any,
  previewUrl: "https://example.com/blog",
};

const mockEntry = {
  _id: "entry_1" as any,
  siteId: "site_1" as any,
  title: "Hello world",
};

describe("contentEntryRoutes.listForEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sorts routes by selected/seen recency", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    ctx._mocks.collect.mockResolvedValue([
      {
        _id: "route_1",
        url: "https://example.com/blog/older",
        lastSeenAt: 50,
        firstSeenAt: 10,
      },
      {
        _id: "route_2",
        url: "https://example.com/blog/newer",
        lastSeenAt: 40,
        lastSelectedAt: 100,
        firstSeenAt: 20,
      },
    ]);
    mockRequireSiteAccess.mockResolvedValue({ site: mockSite } as any);

    const handler = getHandler(contentEntryRoutes.listForEntry);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result.map((route: { _id: string }) => route._id)).toEqual([
      "route_2",
      "route_1",
    ]);
  });
});

describe("contentEntryRoutes.addManual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes relative routes and stores them as manual", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    ctx._mocks.first.mockResolvedValue(null);
    mockRequireSiteAccess.mockResolvedValue({ site: mockSite } as any);

    const handler = getHandler(contentEntryRoutes.addManual);
    await handler(ctx, {
      entryId: "entry_1",
      url: "/blog/hello-world?sid=abc&preview=true&ref=keep",
    });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentEntryRoutes",
      expect.objectContaining({
        entryId: "entry_1",
        siteId: "site_1",
        source: "manual",
        url: "https://example.com/blog/hello-world?ref=keep",
      }),
    );
  });

  it("rejects cross-origin routes", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({ site: mockSite } as any);

    const handler = getHandler(contentEntryRoutes.addManual);
    await expect(
      handler(ctx, { entryId: "entry_1", url: "https://evil.example/path" }),
    ).rejects.toThrow("Route URL must match the site preview URL origin");
  });
});

describe("contentEntryRoutes.select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing route selection timestamp", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    ctx._mocks.first.mockResolvedValue({
      _id: "route_1",
      source: "discovered",
      lastSeenAt: Date.now() - 10_000,
    });
    mockRequireSiteAccess.mockResolvedValue({ site: mockSite } as any);

    const handler = getHandler(contentEntryRoutes.select);
    await handler(ctx, { entryId: "entry_1", url: "/blog/hello-world" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "route_1",
      expect.objectContaining({
        source: "manual",
        lastSelectedAt: expect.any(Number),
      }),
    );
  });
});

describe("contentEntryRoutes.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes a route after access check", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue({
      _id: "route_1",
      siteId: "site_1",
    });
    mockRequireSiteAccess.mockResolvedValue({ site: mockSite } as any);

    const handler = getHandler(contentEntryRoutes.remove);
    await handler(ctx, { routeId: "route_1" });

    expect(ctx.db.delete).toHaveBeenCalledWith("route_1");
  });
});

describe("contentEntryRoutes.reportDiscoveredInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a discovered route for a valid entry", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount += 1;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      return Promise.resolve(mockSite);
    });
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(contentEntryRoutes.reportDiscoveredInternal);
    await handler(ctx, {
      siteId: "site_1",
      entryId: "entry_1",
      url: "https://example.com/blog/hello-world?type=post&slug=hello-world",
    });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentEntryRoutes",
      expect.objectContaining({
        source: "discovered",
        url: "https://example.com/blog/hello-world",
      }),
    );
  });

  it("dedupes known routes within the TTL without patching", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount += 1;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      return Promise.resolve(mockSite);
    });
    ctx._mocks.first.mockResolvedValue({
      _id: "route_1",
      source: "discovered",
      lastSeenAt: Date.now(),
    });

    const handler = getHandler(contentEntryRoutes.reportDiscoveredInternal);
    await handler(ctx, {
      siteId: "site_1",
      entryId: "entry_1",
      url: "https://example.com/blog/hello-world",
    });

    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("rejects entries from a different site", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue({
      ...mockEntry,
      siteId: "site_other",
    });

    const handler = getHandler(contentEntryRoutes.reportDiscoveredInternal);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        entryId: "entry_1",
        url: "https://example.com/blog/hello-world",
      }),
    ).rejects.toThrow("Content entry not found");
  });

  it("rejects routes outside the site path prefix", async () => {
    const ctx = createMockMutationCtx();
    let getCallCount = 0;
    ctx.db.get.mockImplementation(() => {
      getCallCount += 1;
      if (getCallCount === 1) return Promise.resolve(mockEntry);
      return Promise.resolve(mockSite);
    });

    const handler = getHandler(contentEntryRoutes.reportDiscoveredInternal);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        entryId: "entry_1",
        url: "https://example.com/other/hello-world",
      }),
    ).rejects.toThrow(
      "Route URL must stay within the site preview URL path prefix",
    );
  });
});
