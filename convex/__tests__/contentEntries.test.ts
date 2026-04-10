import { vi } from "vitest";
import { createMockMutationCtx, createMockQueryCtx } from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
}));

vi.mock("../lib/utils", () => ({
  slugify: vi.fn((text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  ),
}));

import { requireSiteAccess } from "../lib/access";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);

import * as contentEntries from "../contentEntries";

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

const mockContentType = {
  _id: "ct_1" as any,
  siteId: "site_1",
  name: "Blog Post",
  slug: "blog-post",
  fields: [{ name: "title", type: "text", required: true }],
};

const mockAssetContentType = {
  ...mockContentType,
  fields: [
    { name: "title", type: "text", required: true },
    { name: "heroImage", type: "image", required: false },
    { name: "gallery", type: "gallery", required: false },
  ],
};

const mockHeroAsset = {
  _id: "asset_hero_1" as any,
  siteId: "site_1" as any,
  url: "https://assets.nomess.xyz/hero-1.jpg",
};

const mockGalleryAsset = {
  _id: "asset_gallery_1" as any,
  siteId: "site_1" as any,
  url: "https://assets.nomess.xyz/gallery-1.jpg",
};

const mockEntry = {
  _id: "entry_1" as any,
  siteId: "site_1",
  contentTypeId: "ct_1",
  title: "My Post",
  slug: "my-post",
  draft: { title: "My Post", body: "Draft content" },
  published: { title: "My Post", body: "Published content" },
  status: "published" as const,
  createdAt: 1000,
  createdBy: "user_1",
  updatedAt: 1000,
  updatedBy: "user_1",
  publishedAt: 2000,
  publishedBy: "user_1",
};

const mockAssetEntry = {
  ...mockEntry,
  draft: {
    title: "My Post",
    body: "Draft content",
    heroImage: "asset_hero_1",
    gallery: ["asset_hero_1", "asset_gallery_1"],
  },
  published: {
    title: "My Post",
    body: "Published content",
    heroImage: "asset_hero_1",
    gallery: ["asset_hero_1", "asset_gallery_1"],
  },
};

const mockFragmentTemplateContentType = {
  _id: "ct_fragment_template" as any,
  siteId: "site_1",
  name: "Landing Page",
  slug: "landing-page",
  kind: "template" as const,
  fields: [
    {
      name: "sections",
      type: "array",
      required: false,
      of: {
        type: "object",
        required: false,
        fields: [
          {
            name: "images",
            type: "array",
            required: false,
            of: {
              type: "fragment",
              required: false,
              fragment: "imageWithAlt",
            },
          },
        ],
      },
    },
  ],
};

const mockImageWithAltFragment = {
  _id: "ct_fragment_image" as any,
  siteId: "site_1",
  name: "Image With Alt",
  slug: "image-with-alt",
  kind: "fragment" as const,
  fields: [
    { name: "image", type: "image", required: false },
    { name: "alt", type: "text", required: false },
  ],
};

const mockFragmentAssetEntry = {
  ...mockEntry,
  _id: "entry_fragment" as any,
  contentTypeId: "ct_fragment_template",
  title: "Landing Page",
  slug: "landing-page",
  draft: {
    sections: [
      {
        images: [{ image: "asset_hero_1", alt: "Hero" }],
      },
    ],
  },
  published: {
    sections: [
      {
        images: [{ image: "asset_hero_1", alt: "Hero" }],
      },
    ],
  },
};

const mockDraftEntry = {
  ...mockEntry,
  _id: "entry_2" as any,
  title: "Draft Post",
  slug: "draft-post",
  draft: { title: "Draft Post", body: "Draft only" },
  published: undefined,
  status: "draft" as const,
  publishedAt: undefined,
  publishedBy: undefined,
};

const mockSavedDraftVariant = {
  _id: "draft_saved_1" as any,
  siteId: "site_1" as any,
  entryId: "entry_2" as any,
  name: "Variant A",
  nameLower: "variant a",
  title: "Variant Title",
  draft: { title: "Variant Title", body: "Variant content" },
  createdAt: 1000,
  createdBy: "user_1",
  updatedAt: 1000,
  updatedBy: "user_1",
};

const mockShopifyContentType = {
  _id: "ct_shopify" as any,
  siteId: "site_1",
  name: "Home Page",
  slug: "home-page",
  fields: [
    {
      name: "featuredProduct",
      type: "shopifyProduct",
      required: false,
    },
    {
      name: "featuredCollection",
      type: "shopifyCollection",
      required: false,
    },
  ],
};

const mockShopifyEntry = {
  ...mockEntry,
  contentTypeId: "ct_shopify",
  slug: "home-page",
  published: {
    featuredProduct: "classic-tee",
    featuredCollection: { handle: "summer-sale" },
  },
};

const mockShopifyProduct = {
  _id: "shopify_product_1",
  siteId: "site_1",
  shopifyId: "gid://shopify/Product/1",
  handle: "classic-tee",
  title: "Classic Tee",
  status: "active",
  featuredImage: "https://cdn.example.com/classic-tee.jpg",
  images: [],
  variants: [],
  priceRange: { min: "19.00", max: "19.00" },
  syncedAt: 123,
};

const mockShopifyCollection = {
  _id: "shopify_collection_1",
  siteId: "site_1",
  shopifyId: "gid://shopify/Collection/1",
  handle: "summer-sale",
  title: "Summer Sale",
  image: "https://cdn.example.com/summer-sale.jpg",
  productsCount: 12,
  syncedAt: 123,
};

function mockAssetLookups(ctx: ReturnType<typeof createMockQueryCtx>) {
  ctx.db.get.mockImplementation(async (id) => {
    if (id === "ct_1") return mockAssetContentType;
    if (id === "asset_hero_1") return mockHeroAsset;
    if (id === "asset_gallery_1") return mockGalleryAsset;
    if (id === "entry_1") return mockAssetEntry;
    return null;
  });
}

function mockFragmentAssetLookups(ctx: ReturnType<typeof createMockQueryCtx>) {
  ctx.db.get.mockImplementation(async (id) => {
    if (id === "entry_fragment") return mockFragmentAssetEntry;
    if (id === "ct_fragment_template") return mockFragmentTemplateContentType;
    if (id === "asset_hero_1") return mockHeroAsset;
    return null;
  });

  ctx.db.query.mockImplementation((table: string) => {
    if (table === "contentTypes") {
      return {
        withIndex: () => ({
          collect: vi
            .fn()
            .mockResolvedValue([
              mockFragmentTemplateContentType,
              mockImageWithAltFragment,
            ]),
          first: vi.fn().mockResolvedValue(mockFragmentTemplateContentType),
        }),
      };
    }

    return {
      withIndex: () => ({
        collect: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(null),
      }),
    };
  });
}

function mockShopifyExpansionLookups(
  ctx: ReturnType<typeof createMockQueryCtx>,
  {
    entry = mockShopifyEntry,
    product = mockShopifyProduct,
    collection = mockShopifyCollection,
  }: {
    entry?: typeof mockShopifyEntry;
    product?: typeof mockShopifyProduct | null;
    collection?: typeof mockShopifyCollection | null;
  } = {},
) {
  ctx.db.get.mockImplementation(async (id) => {
    if (id === "ct_shopify") return mockShopifyContentType;
    return null;
  });

  ctx.db.query.mockImplementation((table: string) => {
    if (table === "contentEntries") {
      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([entry]),
          first: vi.fn().mockResolvedValue(entry),
        }),
      };
    }

    if (table === "contentTypes") {
      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([mockShopifyContentType]),
          first: vi.fn().mockResolvedValue(mockShopifyContentType),
        }),
      };
    }

    if (table === "shopifyProducts") {
      return {
        withIndex: () => ({
          first: vi.fn().mockResolvedValue(product),
        }),
      };
    }

    if (table === "shopifyCollections") {
      return {
        withIndex: () => ({
          first: vi.fn().mockResolvedValue(collection),
        }),
      };
    }

    return {
      withIndex: () => ({
        collect: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(null),
      }),
    };
  });
}

describe("contentEntries.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an entry with a provided slug", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null); // no existing entry with slug
    ctx.db.insert.mockResolvedValue("entry_new");

    const handler = getHandler(contentEntries.create);
    const result = await handler(ctx, {
      contentTypeId: "ct_1",
      title: "My Post",
      slug: "my-post",
      draft: { body: "Hello world" },
    });

    expect(result).toBe("entry_new");
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentEntries",
      expect.objectContaining({
        siteId: "site_1",
        contentTypeId: "ct_1",
        title: "My Post",
        slug: "my-post",
        draft: { body: "Hello world" },
        status: "draft",
        createdBy: "user_1",
        updatedBy: "user_1",
      }),
    );
  });

  it("auto-generates slug from title when not provided", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("entry_new");

    const handler = getHandler(contentEntries.create);
    await handler(ctx, {
      contentTypeId: "ct_1",
      title: "Hello World Post",
      draft: { body: "content" },
    });

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "contentEntries",
      expect.objectContaining({
        slug: "hello-world-post",
      }),
    );
  });

  it("throws when content type not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.create);
    await expect(
      handler(ctx, {
        contentTypeId: "ct_missing",
        title: "Post",
        draft: {},
      }),
    ).rejects.toThrow("Content type not found");
  });

  it("throws when slug already exists", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(mockEntry);

    const handler = getHandler(contentEntries.create);
    await expect(
      handler(ctx, {
        contentTypeId: "ct_1",
        title: "My Post",
        slug: "my-post",
        draft: {},
      }),
    ).rejects.toThrow("An entry with this slug already exists");
  });
});

describe("contentEntries.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the entry with provided fields", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.update);
    await handler(ctx, { entryId: "entry_1", title: "Updated Title" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_1",
      expect.objectContaining({
        title: "Updated Title",
        updatedBy: "user_1",
      }),
    );
  });

  it("throws when entry not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.update);
    await expect(
      handler(ctx, { entryId: "entry_missing", title: "Updated" }),
    ).rejects.toThrow("Content entry not found");
  });

  it("throws when changing slug to an existing one", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue({ ...mockEntry, _id: "entry_other" });

    const handler = getHandler(contentEntries.update);
    await expect(
      handler(ctx, { entryId: "entry_1", slug: "other-slug" }),
    ).rejects.toThrow("An entry with this slug already exists");
  });

  it("skips slug check when slug is unchanged", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.update);
    await handler(ctx, { entryId: "entry_1", slug: "my-post" });

    // slug check should be skipped (slug === entry.slug)
    expect(ctx.db.query).not.toHaveBeenCalledWith("contentEntries");
    expect(ctx.db.patch).toHaveBeenCalled();
  });
});

describe("contentEntries.publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies draft to published and updates status", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_2") return mockDraftEntry;
      if (id === "ct_1") return mockContentType;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentEntries") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(mockFragmentAssetEntry),
          }),
        };
      }

      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([mockContentType]),
            first: vi.fn().mockResolvedValue(mockContentType),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.publish);
    await handler(ctx, { entryId: "entry_2" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_2",
      expect.objectContaining({
        published: mockDraftEntry.draft,
        status: "published",
        publishedBy: "user_1",
      }),
    );
  });

  it("throws when entry not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.publish);
    await expect(handler(ctx, { entryId: "entry_missing" })).rejects.toThrow(
      "Content entry not found",
    );
  });

  it("sets publishedAt timestamp", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_2") return mockDraftEntry;
      if (id === "ct_1") return mockContentType;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([mockContentType]),
            first: vi.fn().mockResolvedValue(mockContentType),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const before = Date.now();
    const handler = getHandler(contentEntries.publish);
    await handler(ctx, { entryId: "entry_2" });
    const after = Date.now();

    const patchCall = ctx.db.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(patchCall.publishedAt).toBeGreaterThanOrEqual(before);
    expect(patchCall.publishedAt).toBeLessThanOrEqual(after);
  });

  it("publishes a saved draft variant into both draft and production", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_2") return mockDraftEntry;
      if (id === "ct_1") return mockContentType;
      if (id === "draft_saved_1") return mockSavedDraftVariant;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([mockContentType]),
            first: vi.fn().mockResolvedValue(mockContentType),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    await getHandler(contentEntries.publish)(ctx, {
      entryId: "entry_2",
      draftId: "draft_saved_1",
    });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_2",
      expect.objectContaining({
        title: "Variant Title",
        draft: mockSavedDraftVariant.draft,
        published: mockSavedDraftVariant.draft,
        status: "published",
      }),
    );
  });

  it("blocks publish when downstream schemas still need publishing", async () => {
    const ctx = createMockMutationCtx();
    const draftTemplate = {
      ...mockContentType,
      status: "draft" as const,
      kind: "template" as const,
      fields: [
        {
          name: "hero",
          type: "fragment",
          required: false,
          fragment: "draft-fragment",
        },
      ],
      draft: {
        name: "Blog Post",
        slug: "blog-post",
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
    };
    const draftEntry = {
      ...mockDraftEntry,
      contentTypeId: "ct_template_draft",
    };

    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_2") return draftEntry;
      if (id === "ct_template_draft") return draftTemplate;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([draftTemplate, draftFragment]),
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    await expect(
      getHandler(contentEntries.publish)(ctx, { entryId: "entry_2" }),
    ).rejects.toThrow(
      "Cannot publish until these schemas are published: Draft Fragment (draft-fragment), Blog Post (blog-post)",
    );

    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("publishes draft-only downstream schemas before publishing the entry", async () => {
    const ctx = createMockMutationCtx();
    const draftTemplate = {
      _id: "ct_template_draft" as any,
      siteId: "site_1" as any,
      name: "Blog Post",
      slug: "blog-post",
      kind: "template" as const,
      status: "draft" as const,
      fields: [
        {
          name: "hero",
          type: "fragment",
          required: false,
          fragment: "draft-fragment",
        },
      ],
      draft: {
        name: "Blog Post",
        slug: "blog-post",
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
    const nestedDraftFragment = {
      _id: "ct_fragment_nested" as any,
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
    };
    const draftEntry = {
      ...mockDraftEntry,
      contentTypeId: "ct_template_draft",
    };

    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_2") return draftEntry;
      if (id === "ct_template_draft") return draftTemplate;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi
              .fn()
              .mockResolvedValue([
                draftTemplate,
                draftFragment,
                nestedDraftFragment,
              ]),
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    await getHandler(contentEntries.publish)(ctx, {
      entryId: "entry_2",
      cascade: true,
      expectedCascadeSlugs: ["nested-fragment", "draft-fragment", "blog-post"],
    });

    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      contentTypeIds: [
        "ct_fragment_nested",
        "ct_fragment_draft",
        "ct_template_draft",
      ],
    });
    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_2",
      expect.objectContaining({
        published: draftEntry.draft,
        status: "published",
      }),
    );
  });
});

describe("contentEntries.unpublish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status back to draft and clears published content", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.unpublish);
    await handler(ctx, { entryId: "entry_1" });

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "entry_1",
      expect.objectContaining({
        published: undefined,
        status: "draft",
        updatedBy: "user_1",
      }),
    );
  });

  it("throws when entry not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.unpublish);
    await expect(handler(ctx, { entryId: "entry_missing" })).rejects.toThrow(
      "Content entry not found",
    );
  });
});

describe("contentEntries.remove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the entry", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentEntryDrafts") {
        return {
          withIndex: () => ({
            collect: vi
              .fn()
              .mockResolvedValue([{ _id: "draft_a" }, { _id: "draft_b" }]),
          }),
        };
      }

      if (table === "contentEntryRoutes") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([{ _id: "route_a" }]),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
        }),
      };
    });
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.remove);
    await handler(ctx, { entryId: "entry_1" });

    expect(ctx.db.delete).toHaveBeenCalledWith("draft_a");
    expect(ctx.db.delete).toHaveBeenCalledWith("draft_b");
    expect(ctx.db.delete).toHaveBeenCalledWith("route_a");
    expect(ctx.db.delete).toHaveBeenCalledWith("entry_1");
  });

  it("throws when entry not found", async () => {
    const ctx = createMockMutationCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.remove);
    await expect(handler(ctx, { entryId: "entry_missing" })).rejects.toThrow(
      "Content entry not found",
    );
  });
});

describe("contentEntries.get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the entry when accessible", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockEntry);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);

    const handler = getHandler(contentEntries.get);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result).toEqual(mockEntry);
  });

  it("throws when not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.get);
    await expect(handler(ctx, { entryId: "entry_missing" })).rejects.toThrow(
      "Content entry not found",
    );
  });
});

describe("contentEntries.listByType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns entries for the content type", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockContentType);
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockEntry]);

    const handler = getHandler(contentEntries.listByType);
    const result = await handler(ctx, { contentTypeId: "ct_1" });

    expect(result).toEqual([mockEntry]);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_type",
      expect.any(Function),
    );
  });

  it("throws when content type not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.listByType);
    await expect(handler(ctx, { contentTypeId: "ct_missing" })).rejects.toThrow(
      "Content type not found",
    );
  });
});

describe("contentEntries.listBySite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all entries when no status filter", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockEntry, mockDraftEntry]);

    const handler = getHandler(contentEntries.listBySite);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toHaveLength(2);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });

  it("filters by status when provided", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.collect.mockResolvedValue([mockEntry]);

    const handler = getHandler(contentEntries.listBySite);
    const result = await handler(ctx, {
      siteId: "site_1",
      status: "published",
    });

    expect(result).toEqual([mockEntry]);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_status",
      expect.any(Function),
    );
  });
});

describe("contentEntries.listPublishedByType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only published entries with flattened published content", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([mockEntry, mockDraftEntry]);

    const handler = getHandler(contentEntries.listPublishedByType);
    const result = await handler(ctx, {
      contentTypeId: "ct_1",
      siteId: "site_1",
    });

    // Only the published entry should be returned
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("my-post");
    expect(result[0].title).toBe("My Post");
    expect(result[0].body).toBe("Published content");
    expect(result[0]._id).toBe("entry_1");
    expect(result[0]._publishedAt).toBe(2000);
  });

  it("returns empty array when no published entries", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([mockDraftEntry]);

    const handler = getHandler(contentEntries.listPublishedByType);
    const result = await handler(ctx, {
      contentTypeId: "ct_1",
      siteId: "site_1",
    });

    expect(result).toEqual([]);
  });

  it("resolves image and gallery asset IDs to delivery URLs", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.collect.mockResolvedValue([mockAssetEntry]);
    mockAssetLookups(ctx);

    const handler = getHandler(contentEntries.listPublishedByType);
    const result = await handler(ctx, {
      contentTypeId: "ct_1",
      siteId: "site_1",
    });

    expect(result).toHaveLength(1);
    expect(result[0].heroImage).toBe(mockHeroAsset.url);
    expect(result[0].gallery).toEqual([
      mockHeroAsset.url,
      mockGalleryAsset.url,
    ]);
  });

  it("expands Shopify refs when requested", async () => {
    const ctx = createMockQueryCtx();
    mockShopifyExpansionLookups(ctx);

    const handler = getHandler(contentEntries.listPublishedByType);
    const result = await handler(ctx, {
      contentTypeId: "ct_shopify",
      siteId: "site_1",
      expand: ["shopify"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].featuredProduct).toEqual(mockShopifyProduct);
    expect(result[0].featuredCollection).toEqual(mockShopifyCollection);
  });
});

describe("contentEntries.getBySlugInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns published content by default", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockEntry);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "my-post",
    });

    expect(result).not.toBeNull();
    expect(result.body).toBe("Published content");
    expect(result._status).toBe("published");
  });

  it("returns draft content when preview is true", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockEntry);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "my-post",
      preview: true,
    });

    expect(result).not.toBeNull();
    expect(result.body).toBe("Draft content");
  });

  it("returns null when entry not found", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "nonexistent",
    });

    expect(result).toBeNull();
  });

  it("returns null when not published and not preview mode", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockDraftEntry);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "draft-post",
    });

    expect(result).toBeNull();
  });

  it("returns draft content in preview mode even when not published", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockDraftEntry);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "draft-post",
      preview: true,
    });

    expect(result).not.toBeNull();
    expect(result.body).toBe("Draft only");
    expect(result._status).toBe("draft");
  });

  it("resolves asset-backed fields for published content", async () => {
    const ctx = createMockQueryCtx();
    ctx._mocks.first.mockResolvedValue(mockAssetEntry);
    mockAssetLookups(ctx);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_1",
      slug: "my-post",
    });

    expect(result).not.toBeNull();
    expect(result.heroImage).toBe(mockHeroAsset.url);
    expect(result.gallery).toEqual([mockHeroAsset.url, mockGalleryAsset.url]);
  });

  it("does not resolve draft-only fragment schemas for non-preview delivery", async () => {
    const ctx = createMockQueryCtx();
    const draftOnlyFragment = {
      ...mockImageWithAltFragment,
      status: "draft" as const,
      draft: {
        name: "Image With Alt",
        slug: "image-with-alt",
        kind: "fragment" as const,
        fields: mockImageWithAltFragment.fields,
      },
    };

    ctx.db.get.mockImplementation(async (id) => {
      if (id === "entry_fragment") return mockFragmentAssetEntry;
      if (id === "ct_fragment_template") return mockFragmentTemplateContentType;
      if (id === "asset_hero_1") return mockHeroAsset;
      return null;
    });
    ctx.db.query.mockImplementation((table: string) => {
      if (table === "contentEntries") {
        return {
          withIndex: () => ({
            collect: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(mockFragmentAssetEntry),
          }),
        };
      }

      if (table === "contentTypes") {
        return {
          withIndex: () => ({
            collect: vi
              .fn()
              .mockResolvedValue([
                mockFragmentTemplateContentType,
                draftOnlyFragment,
              ]),
            first: vi.fn().mockResolvedValue(mockFragmentTemplateContentType),
          }),
        };
      }

      return {
        withIndex: () => ({
          collect: vi.fn().mockResolvedValue([]),
          first: vi.fn().mockResolvedValue(null),
        }),
      };
    });

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_fragment_template",
      slug: "landing-page",
    });

    expect(result?.sections).toEqual([
      {
        images: [{ image: "asset_hero_1", alt: "Hero" }],
      },
    ]);

    const previewResult = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_fragment_template",
      slug: "landing-page",
      preview: true,
    });

    expect(previewResult?.sections).toEqual([
      {
        images: [{ image: mockHeroAsset.url, alt: "Hero" }],
      },
    ]);
  });

  it("keeps raw Shopify refs by default and expands them when requested", async () => {
    const ctx = createMockQueryCtx();
    mockShopifyExpansionLookups(ctx);

    const handler = getHandler(contentEntries.getBySlugInternal);
    const rawResult = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_shopify",
      slug: "home-page",
    });
    const expandedResult = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_shopify",
      slug: "home-page",
      expand: ["shopify"],
    });

    expect(rawResult?.featuredProduct).toBe("classic-tee");
    expect(rawResult?.featuredCollection).toEqual({ handle: "summer-sale" });
    expect(expandedResult?.featuredProduct).toEqual(mockShopifyProduct);
    expect(expandedResult?.featuredCollection).toEqual(mockShopifyCollection);
  });

  it("preserves unresolved Shopify refs during expansion", async () => {
    const ctx = createMockQueryCtx();
    mockShopifyExpansionLookups(ctx, { product: null, collection: null });

    const handler = getHandler(contentEntries.getBySlugInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      contentTypeId: "ct_shopify",
      slug: "home-page",
      expand: ["shopify"],
    });

    expect(result?.featuredProduct).toBe("classic-tee");
    expect(result?.featuredCollection).toEqual({ handle: "summer-sale" });
  });
});

describe("contentEntries.getByIdInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns draft content for an entry", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockEntry);

    const handler = getHandler(contentEntries.getByIdInternal);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result).not.toBeNull();
    expect(result.body).toBe("Draft content"); // Uses draft
    expect(result.slug).toBe("my-post");
    expect(result._id).toBe("entry_1");
    expect(result._status).toBe("published");
  });

  it("returns null when entry not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(contentEntries.getByIdInternal);
    const result = await handler(ctx, { entryId: "entry_missing" });

    expect(result).toBeNull();
  });

  it("resolves asset-backed fields for draft content", async () => {
    const ctx = createMockQueryCtx();
    mockAssetLookups(ctx);

    const handler = getHandler(contentEntries.getByIdInternal);
    const result = await handler(ctx, { entryId: "entry_1" });

    expect(result).not.toBeNull();
    expect(result.heroImage).toBe(mockHeroAsset.url);
    expect(result.gallery).toEqual([mockHeroAsset.url, mockGalleryAsset.url]);
  });

  it("resolves asset-backed nested fragment fields when refs use aliases", async () => {
    const ctx = createMockQueryCtx();
    mockFragmentAssetLookups(ctx);

    const handler = getHandler(contentEntries.getByIdInternal);
    const result = await handler(ctx, { entryId: "entry_fragment" });

    expect(result).not.toBeNull();
    expect(result?.sections).toEqual([
      {
        images: [{ image: mockHeroAsset.url, alt: "Hero" }],
      },
    ]);
  });
});
