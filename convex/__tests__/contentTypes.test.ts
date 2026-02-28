import { ConvexError } from "convex/values";
import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
  requireSiteOwner: vi.fn(),
}));

import { requireSiteAccess, requireSiteOwner } from "../lib/access";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);
const mockRequireSiteOwner = vi.mocked(requireSiteOwner);

import * as contentTypes from "../contentTypes";

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

const mockFields = [
  { name: "title", type: "text", required: true },
  { name: "body", type: "textarea", required: false },
];

const mockContentType = {
  _id: "ct_1" as any,
  siteId: "site_1",
  name: "Blog Post",
  slug: "blog-post",
  fields: mockFields,
  createdAt: 1000,
  updatedAt: 1000,
};

describe("contentTypes.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a content type when slug is unique", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null); // no existing content type
    ctx.db.insert.mockResolvedValue("ct_new");

    const handler = getHandler(contentTypes.create);
    const result = await handler(ctx, {
      siteId: "site_1",
      name: "Blog Post",
      slug: "blog-post",
      fields: mockFields,
    });

    expect(result).toBe("ct_new");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentTypes",
      expect.objectContaining({
        siteId: "site_1",
        name: "Blog Post",
        slug: "blog-post",
        fields: mockFields,
      }),
    );
  });

  it("throws when slug already exists for the site", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(mockContentType);

    const handler = getHandler(contentTypes.create);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        name: "Blog Post",
        slug: "blog-post",
        fields: mockFields,
      }),
    ).rejects.toThrow(
      "A content type with this slug already exists for this site",
    );
  });

  it("throws when field names are not unique", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null);

    const duplicateFields = [
      { name: "title", type: "text", required: true },
      { name: "title", type: "textarea", required: false },
    ];

    const handler = getHandler(contentTypes.create);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        name: "Blog Post",
        slug: "blog-post",
        fields: duplicateFields,
      }),
    ).rejects.toThrow("Field names must be unique within a content type");
  });

  it("checks site access before creating", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockRejectedValue(
      new ConvexError("You don't have access to this site"),
    );

    const handler = getHandler(contentTypes.create);
    await expect(
      handler(ctx, {
        siteId: "site_1",
        name: "Blog Post",
        slug: "blog-post",
        fields: mockFields,
      }),
    ).rejects.toThrow("You don't have access to this site");
  });

  it("includes an optional description", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("ct_new");

    const handler = getHandler(contentTypes.create);
    await handler(ctx, {
      siteId: "site_1",
      name: "Blog Post",
      slug: "blog-post",
      description: "A blog post content type",
      fields: mockFields,
    });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentTypes",
      expect.objectContaining({
        description: "A blog post content type",
      }),
    );
  });
});

describe("contentTypes.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the content type with provided fields", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentTypes.update);
    await handler(ctx, { contentTypeId: "ct_1", name: "Updated Post" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "ct_1",
      expect.objectContaining({
        name: "Updated Post",
      }),
    );
  });

  it("throws when content type not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentTypes.update);
    await expect(
      handler(ctx, { contentTypeId: "ct_missing", name: "Updated" }),
    ).rejects.toThrow("Content type not found");
  });

  it("throws when updating slug to an existing one", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue({ ...mockContentType, _id: "ct_other" });

    const handler = getHandler(contentTypes.update);
    await expect(
      handler(ctx, { contentTypeId: "ct_1", slug: "blog-post" }),
    ).rejects.toThrow(
      "A content type with this slug already exists for this site",
    );
  });

  it("allows the same slug for the same content type", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(mockContentType);

    const handler = getHandler(contentTypes.update);
    await handler(ctx, { contentTypeId: "ct_1", slug: "blog-post" });

    expect(ctx.db.patch).toHaveBeenCalled();
  });

  it("validates duplicate field names on field update", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const duplicateFields = [
      { name: "title", type: "text", required: true },
      { name: "title", type: "number", required: false },
    ];

    const handler = getHandler(contentTypes.update);
    await expect(
      handler(ctx, { contentTypeId: "ct_1", fields: duplicateFields }),
    ).rejects.toThrow("Field names must be unique within a content type");
  });
});

describe("contentTypes.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes content type and its entries", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([
      { _id: "entry_1" },
      { _id: "entry_2" },
    ]);

    const handler = getHandler(contentTypes.remove);
    await handler(ctx, { contentTypeId: "ct_1" });

    // Should delete entries
    expect(ctx.db.delete).toHaveBeenCalledWith("entry_1");
    expect(ctx.db.delete).toHaveBeenCalledWith("entry_2");
    // Should delete content type
    expect(ctx.db.delete).toHaveBeenCalledWith("ct_1");
  });

  it("throws when content type not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentTypes.remove);
    await expect(handler(ctx, { contentTypeId: "ct_missing" })).rejects.toThrow(
      "Content type not found",
    );
  });

  it("requires site owner", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteOwner.mockRejectedValue(
      new ConvexError("Only the site owner can perform this action"),
    );

    const handler = getHandler(contentTypes.remove);
    await expect(handler(ctx, { contentTypeId: "ct_1" })).rejects.toThrow(
      "Only the site owner can perform this action",
    );
  });
});

describe("contentTypes.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the content type when found and accessible", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentTypes.get);
    const result = await handler(ctx, { contentTypeId: "ct_1" });

    expect(result).toEqual(mockContentType);
  });

  it("throws when not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentTypes.get);
    await expect(handler(ctx, { contentTypeId: "ct_missing" })).rejects.toThrow(
      "Content type not found",
    );
  });
});

describe("contentTypes.listBySite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns content types for the site", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockContentType]);

    const handler = getHandler(contentTypes.listBySite);
    const result = await handler(ctx, { siteId: "site_1" });

    // listBySite maps results to add status and hasDraft
    expect(result).toEqual([
      {
        ...mockContentType,
        status: "published",
        hasDraft: false,
      },
    ]);
    expect(ctx.db.query).toHaveBeenCalledWith("contentTypes");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });
});

describe("contentTypes.getBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the content type by slug", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(mockContentType);

    const handler = getHandler(contentTypes.getBySlug);
    const result = await handler(ctx, { siteId: "site_1", slug: "blog-post" });

    expect(result).toEqual(mockContentType);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_slug",
      expect.any(Function),
    );
  });

  it("returns null when not found", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(contentTypes.getBySlug);
    const result = await handler(ctx, {
      siteId: "site_1",
      slug: "nonexistent",
    });

    expect(result).toBeNull();
  });
});

describe("contentTypes.getBySlugInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries without access check", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockContentType);

    const handler = getHandler(contentTypes.getBySlugInternal);
    const result = await handler(ctx, { siteId: "site_1", slug: "blog-post" });

    expect(result).toEqual(mockContentType);
    // No access check should be called
    expect(requireSiteAccess).not.toHaveBeenCalled();
  });
});
