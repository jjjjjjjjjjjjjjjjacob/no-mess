import { ConvexError } from "convex/values";
import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
}));

import { requireSiteAccess } from "../lib/access";
import { getCurrentUser } from "../lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRequireSiteAccess = vi.mocked(requireSiteAccess);

import * as assets from "../assets";

function getHandler(fn: any) {
  return fn._handler;
}

const mockUser = {
  _id: "user_1" as any,
  clerkId: "clerk_1",
  email: "owner@example.com",
  name: "Owner",
  createdAt: 1000,
};

const mockSite = {
  _id: "site_1" as any,
  ownerId: "user_1",
  name: "Test Site",
  slug: "test-site",
};

const mockAsset = {
  _id: "asset_1" as any,
  siteId: "site_1",
  storageId: "storage_1",
  filename: "image.png",
  mimeType: "image/png",
  size: 1024,
  width: 800,
  height: 600,
  url: "https://example.com/image.png",
  uploadedAt: 2000,
  uploadedBy: "user_1",
};

describe("assets.generateUploadUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an upload URL when authenticated", async () => {
    const ctx = createMockMutationCtx();
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      generateUploadUrl: vi.fn().mockResolvedValue("https://upload.url"),
    };
    mockGetCurrentUser.mockResolvedValue(mockUser as any);

    const handler = getHandler(assets.generateUploadUrl);
    const result = await handler(ctx, {});

    expect(result).toBe("https://upload.url");
    expect(mockGetCurrentUser).toHaveBeenCalledWith(ctx);
  });

  it("throws when not authenticated", async () => {
    const ctx = createMockMutationCtx();
    mockGetCurrentUser.mockRejectedValue(new ConvexError("Not authenticated"));

    const handler = getHandler(assets.generateUploadUrl);
    await expect(handler(ctx, {})).rejects.toThrow("Not authenticated");
  });
});

describe("assets.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an asset record with storage URL", async () => {
    const ctx = createMockMutationCtx();
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      getUrl: vi.fn().mockResolvedValue("https://storage.url/image.png"),
    };
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx.db.insert.mockResolvedValue("asset_new");

    const handler = getHandler(assets.create);
    const result = await handler(ctx, {
      siteId: "site_1",
      storageId: "storage_1",
      filename: "image.png",
      mimeType: "image/png",
      size: 1024,
      width: 800,
      height: 600,
    });

    expect(result).toBe("asset_new");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "assets",
      expect.objectContaining({
        siteId: "site_1",
        storageId: "storage_1",
        filename: "image.png",
        mimeType: "image/png",
        size: 1024,
        width: 800,
        height: 600,
        url: "https://storage.url/image.png",
        uploadedBy: "user_1",
      }),
    );
  });

  it("throws when storage URL cannot be obtained", async () => {
    const ctx = createMockMutationCtx();
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      getUrl: vi.fn().mockResolvedValue(null),
    };
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(assets.create);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        storageId: "storage_1",
        filename: "image.png",
        mimeType: "image/png",
        size: 1024,
      }),
    ).rejects.toThrow("Failed to get storage URL");
  });

  it("checks site access before creating", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockRejectedValue(
      new ConvexError("You don't have access to this site"),
    );

    const handler = getHandler(assets.create);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        storageId: "storage_1",
        filename: "image.png",
        mimeType: "image/png",
        size: 1024,
      }),
    ).rejects.toThrow("You don't have access to this site");
  });

  it("sets uploadedAt timestamp", async () => {
    const ctx = createMockMutationCtx();
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      getUrl: vi.fn().mockResolvedValue("https://storage.url/image.png"),
    };
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx.db.insert.mockResolvedValue("asset_new");

    const before = Date.now();
    const handler = getHandler(assets.create);
    await handler(ctx, {
      siteId: "site_1",
      storageId: "storage_1",
      filename: "image.png",
      mimeType: "image/png",
      size: 1024,
    });
    const after = Date.now();

    const insertData = ctx.db.insert.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(insertData.uploadedAt).toBeGreaterThanOrEqual(before);
    expect(insertData.uploadedAt).toBeLessThanOrEqual(after);
  });
});

describe("assets.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes asset and its storage", async () => {
    const ctx = createMockMutationCtx();
    const mockStorageDelete = vi.fn().mockResolvedValue(undefined);
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      delete: mockStorageDelete,
    };
    ctx.db.get.mockResolvedValue(mockAsset);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(assets.remove);
    await handler(ctx, { assetId: "asset_1" });

    expect(mockStorageDelete).toHaveBeenCalledWith("storage_1");
    expect(ctx.db.delete).toHaveBeenCalledWith("asset_1");
  });

  it("throws when asset not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(assets.remove);
    await expect(handler(ctx, { assetId: "asset_missing" })).rejects.toThrow(
      "Asset not found",
    );
  });
});

describe("assets.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the asset when accessible", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockAsset);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(assets.get);
    const result = await handler(ctx, { assetId: "asset_1" });

    expect(result).toEqual(mockAsset);
  });

  it("throws when not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(assets.get);
    await expect(handler(ctx, { assetId: "asset_missing" })).rejects.toThrow(
      "Asset not found",
    );
  });
});

describe("assets.listBySite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns assets sorted by uploadedAt descending", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const olderAsset = { ...mockAsset, _id: "asset_2", uploadedAt: 1000 };
    const newerAsset = { ...mockAsset, _id: "asset_3", uploadedAt: 3000 };
    ctx._mocks.collect.mockResolvedValue([olderAsset, mockAsset, newerAsset]);

    const handler = getHandler(assets.listBySite);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toHaveLength(3);
    // Should be sorted by uploadedAt descending
    expect(result[0].uploadedAt).toBe(3000);
    expect(result[1].uploadedAt).toBe(2000);
    expect(result[2].uploadedAt).toBe(1000);
  });

  it("queries with by_site index", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(assets.listBySite);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.db.query).toHaveBeenCalledWith("assets");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });
});
