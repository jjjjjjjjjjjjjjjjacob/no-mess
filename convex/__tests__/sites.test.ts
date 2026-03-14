import { ConvexError } from "convex/values";
import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

// Mock dependencies
vi.mock("../lib/auth", () => ({
  getCurrentUser: vi.fn(),
  getCurrentUserOrNull: vi.fn(),
}));

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
  requireSiteOwner: vi.fn(),
}));

vi.mock("../lib/utils", () => ({
  generateApiKey: vi.fn(() => "nm_testapikey123"),
  generatePublishableKey: vi.fn(() => "nm_pub_testpubkey789"),
  generatePreviewSecret: vi.fn(() => "testpreviewsecret456"),
}));

import { requireSiteAccess, requireSiteOwner } from "../lib/access";
import { getCurrentUser, getCurrentUserOrNull } from "../lib/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetCurrentUserOrNull = vi.mocked(getCurrentUserOrNull);
const mockRequireSiteAccess = vi.mocked(requireSiteAccess);
const mockRequireSiteOwner = vi.mocked(requireSiteOwner);

// Import the module to get the Convex-wrapped functions
import * as sites from "../sites";

// Helper to extract handler from a Convex function
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
  apiKey: "nm_oldkey",
  previewSecret: "oldsecret",
  createdAt: 1000,
  updatedAt: 1000,
};

describe("sites.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a site when slug is unique", async () => {
    const ctx = createMockMutationCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx._mocks.first.mockResolvedValue(null); // no existing site with slug
    ctx.db.insert.mockResolvedValue("new_site_id");

    const handler = getHandler(sites.create);
    const result = await handler(ctx, { name: "My Site", slug: "my-site" });

    expect(result).toBe("new_site_id");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "sites",
      expect.objectContaining({
        ownerId: "user_1",
        name: "My Site",
        slug: "my-site",
        apiKey: "nm_testapikey123",
        publishableKey: "nm_pub_testpubkey789",
        previewSecret: "testpreviewsecret456",
      }),
    );
  });

  it("throws when slug already exists", async () => {
    const ctx = createMockMutationCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx._mocks.first.mockResolvedValue(mockSite); // existing site with slug

    const handler = getHandler(sites.create);
    await expect(
      handler(ctx, { name: "Another", slug: "test-site" }),
    ).rejects.toThrow(ConvexError);
    await expect(
      handler(ctx, { name: "Another", slug: "test-site" }),
    ).rejects.toThrow("A site with this slug already exists");
  });

  it("queries sites table with by_slug index", async () => {
    const ctx = createMockMutationCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("new_site_id");

    const handler = getHandler(sites.create);
    await handler(ctx, { name: "My Site", slug: "my-site" });

    expect(ctx.db.query).toHaveBeenCalledWith("sites");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_slug",
      expect.any(Function),
    );
  });

  it("sets createdAt and updatedAt timestamps", async () => {
    const ctx = createMockMutationCtx();
    mockGetCurrentUser.mockResolvedValue(mockUser as any);
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("new_site_id");

    const before = Date.now();
    const handler = getHandler(sites.create);
    await handler(ctx, { name: "My Site", slug: "my-site" });
    const after = Date.now();

    const insertCall = ctx.db.insert.mock.calls[0];
    const insertData = insertCall[1];
    expect(insertData.createdAt).toBeGreaterThanOrEqual(before);
    expect(insertData.createdAt).toBeLessThanOrEqual(after);
    expect(insertData.updatedAt).toBe(insertData.createdAt);
  });
});

describe("sites.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the site with provided fields", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.update);
    await handler(ctx, { siteId: "site_1", name: "Updated Site" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "site_1",
      expect.objectContaining({
        name: "Updated Site",
      }),
    );
  });

  it("checks slug uniqueness on slug update", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    // Return a different site with the same slug
    ctx._mocks.first.mockResolvedValue({ ...mockSite, _id: "site_other" });

    const handler = getHandler(sites.update);
    await expect(
      handler(ctx, { siteId: "site_1", slug: "test-site" }),
    ).rejects.toThrow("A site with this slug already exists");
  });

  it("allows the same slug if it belongs to the same site", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    // Return the same site (same _id)
    ctx._mocks.first.mockResolvedValue(mockSite);

    const handler = getHandler(sites.update);
    await handler(ctx, { siteId: "site_1", slug: "test-site" });

    expect(ctx.db.patch).toHaveBeenCalled();
  });

  it("updates only provided optional fields", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.update);
    await handler(ctx, { siteId: "site_1", previewUrl: "https://preview.com" });

    const patchCall = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchCall.previewUrl).toBe("https://preview.com");
    expect(patchCall.name).toBeUndefined();
    expect(patchCall.slug).toBeUndefined();
    expect(patchCall.updatedAt).toBeDefined();
  });

  it("requires site owner", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(sites.update);
    await expect(
      handler(ctx, { siteId: "site_1", name: "New" }),
    ).rejects.toThrow("Only the site owner can perform this action");
  });
});

describe("sites.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the site and all related records", async () => {
    const ctx = createMockMutationCtx();
    // Add storage.delete mock
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    // Mock collect to return empty arrays for related records
    ctx._mocks.collect.mockResolvedValue([]);

    const handler = getHandler(sites.remove);
    await handler(ctx, { siteId: "site_1" });

    // Should have queried for related records (contentTypes, contentEntries, assets, siteAccess, shopifyProducts, shopifyCollections)
    expect(ctx.db.query).toHaveBeenCalledWith("contentTypes");
    expect(ctx.db.query).toHaveBeenCalledWith("contentEntries");
    expect(ctx.db.query).toHaveBeenCalledWith("assets");
    expect(ctx.db.query).toHaveBeenCalledWith("siteAccess");
    expect(ctx.db.query).toHaveBeenCalledWith("shopifyProducts");
    expect(ctx.db.query).toHaveBeenCalledWith("shopifyCollections");

    // Should have deleted the site itself
    expect(ctx.db.delete).toHaveBeenCalledWith("site_1");
  });

  it("deletes storage for assets", async () => {
    const ctx = createMockMutationCtx();
    const mockStorageDelete = vi.fn().mockResolvedValue(undefined);
    (ctx as any).storage = {
      ...((ctx as any).storage || {}),
      delete: mockStorageDelete,
    };

    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const mockAsset = {
      _id: "asset_1",
      storageId: "storage_1",
      siteId: "site_1",
    };

    // Return assets on the third collect call (assets query)
    let callCount = 0;
    ctx._mocks.collect.mockImplementation(() => {
      callCount++;
      // 1=contentTypes, 2=contentEntries, 3=assets, 4=siteAccess, 5=shopifyProducts, 6=shopifyCollections
      if (callCount === 3) return Promise.resolve([mockAsset]);
      return Promise.resolve([]);
    });

    const handler = getHandler(sites.remove);
    await handler(ctx, { siteId: "site_1" });

    expect(mockStorageDelete).toHaveBeenCalledWith("storage_1");
    expect(ctx.db.delete).toHaveBeenCalledWith("asset_1");
  });
});

describe("sites.regenerateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the site with a new API key", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.regenerateApiKey);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "site_1",
      expect.objectContaining({
        apiKey: "nm_testapikey123",
      }),
    );
  });

  it("requires site owner", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(sites.regenerateApiKey);
    await expect(handler(ctx, { siteId: "site_1" })).rejects.toThrow(
      "Only the site owner can perform this action",
    );
  });
});

describe("sites.regeneratePreviewSecret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the site with a new preview secret", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.regeneratePreviewSecret);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "site_1",
      expect.objectContaining({
        previewSecret: "testpreviewsecret456",
      }),
    );
  });
});

describe("sites.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the site when user has access", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.get);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual(mockSite);
  });

  it("throws when user does not have access", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockRejectedValue(
      new ConvexError("You don't have access to this site"),
    );

    const handler = getHandler(sites.get);
    await expect(handler(ctx, { siteId: "site_1" })).rejects.toThrow(
      "You don't have access to this site",
    );
  });
});

describe("sites.getBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the site for the owner", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockSite);
    mockGetCurrentUserOrNull.mockResolvedValue(mockUser as any);

    const handler = getHandler(sites.getBySlug);
    const result = await handler(ctx, { slug: "test-site" });

    expect(result).toEqual(mockSite);
  });

  it("returns null when site does not exist", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(sites.getBySlug);
    const result = await handler(ctx, { slug: "nonexistent" });

    expect(result).toBeNull();
  });

  it("returns null when user has no access", async () => {
    const ctx = createMockQueryCtx();
    const otherUser = { ...mockUser, _id: "user_other" };

    // first() is shared across all chained queries.
    // Call 1: site lookup by slug -> returns the site
    // Call 2: siteAccess lookup -> returns null (no access record)
    let firstCallCount = 0;
    ctx._mocks.first.mockImplementation(() => {
      firstCallCount++;
      if (firstCallCount === 1) return Promise.resolve(mockSite); // site lookup
      return Promise.resolve(null); // siteAccess lookup
    });
    mockGetCurrentUserOrNull.mockResolvedValue(otherUser as any);

    const handler = getHandler(sites.getBySlug);
    const result = await handler(ctx, { slug: "test-site" });

    // The user is not the owner and no access record => null
    expect(result).toBeNull();
  });

  it("returns null when not authenticated", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockSite);
    mockGetCurrentUserOrNull.mockResolvedValue(null);

    const handler = getHandler(sites.getBySlug);
    const result = await handler(ctx, { slug: "test-site" });

    expect(result).toBeNull();
  });
});

describe("sites.listForCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when not authenticated", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUserOrNull.mockResolvedValue(null);

    const handler = getHandler(sites.listForCurrentUser);
    const result = await handler(ctx, {});

    expect(result).toEqual([]);
  });

  it("returns owned sites", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUserOrNull.mockResolvedValue(mockUser as any);
    ctx._mocks.collect
      .mockResolvedValueOnce([mockSite]) // owned sites
      .mockResolvedValueOnce([]); // access records

    const handler = getHandler(sites.listForCurrentUser);
    const result = await handler(ctx, {});

    expect(result).toEqual([mockSite]);
  });

  it("includes shared sites from access records", async () => {
    const ctx = createMockQueryCtx();
    const sharedSite = {
      _id: "site_2",
      name: "Shared Site",
      ownerId: "user_other",
    };
    mockGetCurrentUserOrNull.mockResolvedValue(mockUser as any);
    ctx._mocks.collect
      .mockResolvedValueOnce([mockSite]) // owned sites
      .mockResolvedValueOnce([
        { siteId: "site_2", userId: "user_1", role: "editor" },
      ]); // access records
    ctx.db.get.mockResolvedValue(sharedSite);

    const handler = getHandler(sites.listForCurrentUser);
    const result = await handler(ctx, {});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockSite);
    expect(result[1]).toEqual(sharedSite);
  });

  it("does not duplicate owned sites that also have access records", async () => {
    const ctx = createMockQueryCtx();
    mockGetCurrentUserOrNull.mockResolvedValue(mockUser as any);
    ctx._mocks.collect
      .mockResolvedValueOnce([mockSite]) // owned sites
      .mockResolvedValueOnce([
        { siteId: "site_1", userId: "user_1", role: "editor" },
      ]); // access to own site

    const handler = getHandler(sites.listForCurrentUser);
    const result = await handler(ctx, {});

    // Should only include the owned site once
    expect(result).toEqual([mockSite]);
  });
});

describe("sites.regeneratePublishableKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the site with a new publishable key", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(sites.regeneratePublishableKey);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "site_1",
      expect.objectContaining({
        publishableKey: "nm_pub_testpubkey789",
      }),
    );
  });

  it("requires site owner", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(sites.regeneratePublishableKey);
    await expect(handler(ctx, { siteId: "site_1" })).rejects.toThrow(
      "Only the site owner can perform this action",
    );
  });
});

describe("sites.getByPublishableKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries sites by publishable key index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockSite);

    const handler = getHandler(sites.getByPublishableKey);
    const result = await handler(ctx, {
      publishableKey: "nm_pub_testpubkey789",
    });

    expect(result).toEqual(mockSite);
    expect(ctx.db.query).toHaveBeenCalledWith("sites");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_publishable_key",
      expect.any(Function),
    );
  });

  it("returns null when no site matches", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(sites.getByPublishableKey);
    const result = await handler(ctx, {
      publishableKey: "nm_pub_nonexistent",
    });

    expect(result).toBeNull();
  });
});

describe("sites.backfillPublishableKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("backfills sites without a publishable key", async () => {
    const ctx = createMockMutationCtx();
    const siteWithoutKey = { ...mockSite, publishableKey: undefined };
    const siteWithKey = {
      ...mockSite,
      _id: "site_2",
      publishableKey: "nm_pub_existing",
    };
    ctx._mocks.collect.mockResolvedValue([siteWithoutKey, siteWithKey]);

    const handler = getHandler(sites.backfillPublishableKeys);
    const result = await handler(ctx, {});

    expect(result).toEqual({ updated: 1 });
    expect(ctx.db.patch).toHaveBeenCalledTimes(1);
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "site_1",
      expect.objectContaining({
        publishableKey: "nm_pub_testpubkey789",
      }),
    );
  });

  it("does nothing when all sites have publishable keys", async () => {
    const ctx = createMockMutationCtx();
    const siteWithKey = {
      ...mockSite,
      publishableKey: "nm_pub_existing",
    };
    ctx._mocks.collect.mockResolvedValue([siteWithKey]);

    const handler = getHandler(sites.backfillPublishableKeys);
    const result = await handler(ctx, {});

    expect(result).toEqual({ updated: 0 });
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });
});

describe("sites.getByApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries sites by api key index", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockSite);

    const handler = getHandler(sites.getByApiKey);
    const result = await handler(ctx, { apiKey: "nm_testapikey123" });

    expect(result).toEqual(mockSite);
    expect(ctx.db.query).toHaveBeenCalledWith("sites");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_api_key",
      expect.any(Function),
    );
  });

  it("returns null when no site matches", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(sites.getByApiKey);
    const result = await handler(ctx, { apiKey: "nm_nonexistent" });

    expect(result).toBeNull();
  });
});
