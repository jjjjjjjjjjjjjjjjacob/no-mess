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

const normalizedMockContentType = {
  ...mockContentType,
  kind: "template",
  mode: "collection",
  route: undefined,
  draft: undefined,
};

const mockFragmentSchema = {
  _id: "ct_fragment" as any,
  siteId: "site_1" as any,
  name: "Image With Alt",
  slug: "image-with-alt",
  kind: "fragment" as const,
  fields: [{ name: "image", type: "image", required: false }],
  createdAt: 1000,
  updatedAt: 1000,
};

function mockContentTypeQueries(
  ctx:
    | ReturnType<typeof createMockMutationCtx>
    | ReturnType<typeof createMockQueryCtx>,
  options: {
    bySlug?: unknown;
    bySite?: unknown[];
    byType?: unknown[];
  } = {},
) {
  ctx.db.query.mockImplementation((table: string) => {
    if (table === "contentTypes") {
      return {
        withIndex: (index: string) => {
          if (index === "by_slug") {
            return {
              first: vi.fn().mockResolvedValue(options.bySlug ?? null),
              collect: vi.fn().mockResolvedValue([]),
            };
          }

          if (index === "by_site") {
            return {
              first: vi.fn().mockResolvedValue(null),
              collect: vi.fn().mockResolvedValue(options.bySite ?? []),
            };
          }

          return {
            first: vi.fn().mockResolvedValue(null),
            collect: vi.fn().mockResolvedValue([]),
          };
        },
      };
    }

    if (table === "contentEntries") {
      return {
        withIndex: () => ({
          first: vi.fn().mockResolvedValue(null),
          collect: vi.fn().mockResolvedValue(options.byType ?? []),
        }),
      };
    }

    return {
      withIndex: () => ({
        first: vi.fn().mockResolvedValue(null),
        collect: vi.fn().mockResolvedValue([]),
      }),
    };
  });
}

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
    ).rejects.toThrow("must be unique within its group");
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

  it("canonicalizes fragment alias refs on create when the fragment exists", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    mockContentTypeQueries(ctx, {
      bySlug: null,
      bySite: [mockFragmentSchema],
    });
    ctx.db.insert.mockResolvedValue("ct_new");

    await getHandler(contentTypes.create)(ctx, {
      siteId: "site_1",
      name: "Landing Page",
      slug: "landing-page",
      fields: [
        {
          name: "hero",
          type: "fragment",
          required: false,
          fragment: "imageWithAlt",
        },
      ],
    });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentTypes",
      expect.objectContaining({
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "image-with-alt",
          },
        ],
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
    ).rejects.toThrow("must be unique within its group");
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

    expect(result).toEqual(normalizedMockContentType);
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
        ...normalizedMockContentType,
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

    expect(result).toEqual(normalizedMockContentType);
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

    expect(result).toEqual(normalizedMockContentType);
    // No access check should be called
    expect(requireSiteAccess).not.toHaveBeenCalled();
  });
});

describe("contentTypes.publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks publish when downstream draft-only schemas exist and cascade is not confirmed", async () => {
    const ctx = createMockMutationCtx();
    const draftFragment = {
      _id: "ct_fragment_draft" as any,
      siteId: "site_1" as any,
      name: "Draft Fragment",
      slug: "draft-fragment",
      kind: "fragment" as const,
      status: "draft" as const,
      fields: [{ name: "copy", type: "text", required: false }],
      draft: {
        name: "Draft Fragment",
        slug: "draft-fragment",
        kind: "fragment" as const,
        fields: [{ name: "copy", type: "text", required: false }],
      },
      createdAt: 1000,
      updatedAt: 1000,
    };
    const publishingSchema = {
      ...mockContentType,
      status: "draft" as const,
      draft: {
        name: "Landing Page",
        slug: "landing-page",
        kind: "template" as const,
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "draft-fragment",
          },
        ],
      },
    };

    ctx.db.get.mockResolvedValue(publishingSchema);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    mockContentTypeQueries(ctx, {
      bySlug: publishingSchema,
      bySite: [publishingSchema, draftFragment],
    });

    await expect(
      getHandler(contentTypes.publish)(ctx, { contentTypeId: "ct_1" }),
    ).rejects.toThrow(
      "Cannot publish until these schemas are published: Draft Fragment (draft-fragment)",
    );

    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("rejects stale cascade slugs", async () => {
    const ctx = createMockMutationCtx();
    const draftFragment = {
      _id: "ct_fragment_draft" as any,
      siteId: "site_1" as any,
      name: "Draft Fragment",
      slug: "draft-fragment",
      kind: "fragment" as const,
      status: "draft" as const,
      fields: [{ name: "copy", type: "text", required: false }],
      draft: {
        name: "Draft Fragment",
        slug: "draft-fragment",
        kind: "fragment" as const,
        fields: [{ name: "copy", type: "text", required: false }],
      },
      createdAt: 1000,
      updatedAt: 1000,
    };
    const publishingSchema = {
      ...mockContentType,
      status: "draft" as const,
      draft: {
        name: "Landing Page",
        slug: "landing-page",
        kind: "template" as const,
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "draft-fragment",
          },
        ],
      },
    };

    ctx.db.get.mockResolvedValue(publishingSchema);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    mockContentTypeQueries(ctx, {
      bySlug: publishingSchema,
      bySite: [publishingSchema, draftFragment],
    });

    await expect(
      getHandler(contentTypes.publish)(ctx, {
        contentTypeId: "ct_1",
        cascade: true,
        expectedCascadeSlugs: [],
      }),
    ).rejects.toThrow(
      "Publish dependencies changed. Review these schemas and try again: Draft Fragment (draft-fragment)",
    );

    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("passes dependency-first cascade ids before publishing the root schema", async () => {
    const ctx = createMockMutationCtx();
    const nestedFragment = {
      _id: "ct_nested" as any,
      siteId: "site_1" as any,
      name: "Nested Fragment",
      slug: "nested-fragment",
      kind: "fragment" as const,
      status: "draft" as const,
      fields: [{ name: "copy", type: "text", required: false }],
      draft: {
        name: "Nested Fragment",
        slug: "nested-fragment",
        kind: "fragment" as const,
        fields: [{ name: "copy", type: "text", required: false }],
      },
      createdAt: 1000,
      updatedAt: 1000,
    };
    const draftFragment = {
      _id: "ct_fragment_draft" as any,
      siteId: "site_1" as any,
      name: "Draft Fragment",
      slug: "draft-fragment",
      kind: "fragment" as const,
      status: "draft" as const,
      fields: [{ name: "copy", type: "text", required: false }],
      draft: {
        name: "Draft Fragment",
        slug: "draft-fragment",
        kind: "fragment" as const,
        fields: [
          {
            name: "nested",
            type: "fragment",
            required: false,
            fragment: "nested-fragment",
          },
        ],
      },
      createdAt: 1000,
      updatedAt: 1000,
    };
    const publishingSchema = {
      ...mockContentType,
      status: "draft" as const,
      draft: {
        name: "Landing Page",
        slug: "landing-page",
        kind: "template" as const,
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "draft-fragment",
          },
        ],
      },
    };

    ctx.db.get.mockResolvedValue(publishingSchema);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    mockContentTypeQueries(ctx, {
      bySlug: publishingSchema,
      bySite: [publishingSchema, draftFragment, nestedFragment],
    });

    await getHandler(contentTypes.publish)(ctx, {
      contentTypeId: "ct_1",
      cascade: true,
      expectedCascadeSlugs: ["nested-fragment", "draft-fragment"],
    });

    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      contentTypeIds: ["ct_nested", "ct_fragment_draft"],
    });
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "ct_1",
      expect.objectContaining({
        status: "published",
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "draft-fragment",
          },
        ],
      }),
    );
  });
});

describe("contentTypes.runSchemaModelBackfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes legacy published and draft schema records for a site", async () => {
    const legacyContentType = {
      _id: "ct_legacy" as any,
      siteId: "site_1",
      name: "Legacy Post",
      slug: "legacy-post",
      description: "Legacy description",
      fields: mockFields,
      createdAt: 1000,
      updatedAt: 1000,
      draft: {
        name: "Legacy Draft",
        slug: "legacy-post",
        description: "Draft description",
        fields: mockFields,
      },
    };

    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([legacyContentType]);

    const handler = getHandler(contentTypes.runSchemaModelBackfill);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual({ updated: 1 });
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "ct_legacy",
      expect.objectContaining({
        kind: "template",
        mode: "collection",
        route: undefined,
        fields: mockFields,
        draft: {
          name: "Legacy Draft",
          slug: "legacy-post",
          kind: "template",
          mode: "collection",
          route: undefined,
          description: "Draft description",
          fields: mockFields,
        },
      }),
    );
  });
});

describe("contentTypes.repairFragmentReferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rewrites published and draft fragment alias refs to canonical slugs", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const brokenTemplate = {
      _id: "ct_broken" as any,
      siteId: "site_1" as any,
      name: "Landing Page",
      slug: "landing-page",
      kind: "template" as const,
      fields: [
        {
          name: "hero",
          type: "fragment",
          required: false,
          fragment: "imageWithAlt",
        },
      ],
      draft: {
        name: "Landing Page",
        slug: "landing-page",
        kind: "template" as const,
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "imageWithAlt",
          },
        ],
      },
      createdAt: 1000,
      updatedAt: 1000,
    };

    mockContentTypeQueries(ctx, {
      bySite: [brokenTemplate, mockFragmentSchema],
    });

    const result = await getHandler(contentTypes.repairFragmentReferences)(
      ctx,
      {
        siteId: "site_1",
      },
    );

    expect(result.scanned).toBe(2);
    expect(result.updated).toBe(1);
    expect(result.unresolved).toEqual([]);
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "ct_broken",
      expect.objectContaining({
        fields: [
          {
            name: "hero",
            type: "fragment",
            required: false,
            fragment: "image-with-alt",
          },
        ],
        draft: expect.objectContaining({
          fields: [
            {
              name: "hero",
              type: "fragment",
              required: false,
              fragment: "image-with-alt",
            },
          ],
        }),
      }),
    );
  });
});

describe("contentTypes.runTemplateMigration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the template schema and transforms existing entry content", async () => {
    const ctx = createMockMutationCtx();
    mockRequireSiteOwner.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue({
      ...mockContentType,
      slug: "homepage",
    });
    ctx._mocks.collect.mockResolvedValue([
      {
        _id: "entry_1",
        draft: {
          headline: "Welcome",
          image1: "asset-1",
          image1Alt: "Slide 1",
          image1Label: "One",
        },
        published: {
          headline: "Welcome",
          image1: "asset-1",
          image1Alt: "Slide 1",
        },
      },
    ]);

    const handler = getHandler(contentTypes.runTemplateMigration);
    const result = await handler(ctx, {
      siteId: "site_1",
      migrationName: "mershy-homepage-hero-slides",
    });

    expect(result).toEqual({
      migration: "mershy-homepage-hero-slides",
      contentTypeId: mockContentType._id,
      updatedEntries: 1,
    });
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_1",
      expect.objectContaining({
        draft: {
          headline: "Welcome",
          hero: {
            slides: [{ image: "asset-1", alt: "Slide 1", label: "One" }],
          },
        },
        published: {
          headline: "Welcome",
          hero: {
            slides: [{ image: "asset-1", alt: "Slide 1" }],
          },
        },
      }),
    );
    expect(ctx.db.patch).toHaveBeenCalledWith(
      mockContentType._id,
      expect.objectContaining({
        fields: [
          expect.objectContaining({
            name: "hero",
            type: "object",
          }),
        ],
      }),
    );
  });
});
