import { vi } from "vitest";
import {
  createMockActionCtx,
  createMockMutationCtx,
  createMockQueryCtx,
} from "./helpers/mockCtx";

vi.mock("../lib/access", () => ({
  requireSiteAccess: vi.fn(),
}));

vi.mock("../lib/shopify", () => ({
  fetchProducts: vi.fn(),
  fetchCollections: vi.fn(),
  testConnection: vi.fn(),
}));

vi.mock("../_generated/api", () => ({
  internal: {
    shopify: {
      getSiteForSync: "internal:shopify:getSiteForSync",
      upsertProduct: "internal:shopify:upsertProduct",
      upsertCollection: "internal:shopify:upsertCollection",
      updateSyncTimestamp: "internal:shopify:updateSyncTimestamp",
      listProductsInternal: "internal:shopify:listProductsInternal",
      getProductByHandleInternal: "internal:shopify:getProductByHandleInternal",
    },
  },
}));

import { requireSiteAccess } from "../lib/access";
import {
  fetchCollections,
  fetchProducts,
  testConnection,
} from "../lib/shopify";

const mockRequireSiteAccess = vi.mocked(requireSiteAccess);
const mockFetchProducts = vi.mocked(fetchProducts);
const mockFetchCollections = vi.mocked(fetchCollections);
const mockTestConnection = vi.mocked(testConnection);

import * as shopify from "../shopify";

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
  shopifyDomain: "myshop.myshopify.com",
  shopifyToken: "shpat_token123",
};

const mockSiteNoShopify = {
  _id: "site_2" as any,
  ownerId: "user_1",
  name: "No Shopify Site",
  slug: "no-shopify",
};

const mockIdentity = {
  subject: "clerk_1",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|clerk_1",
};

describe("shopify.testShopifyConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to testConnection lib function", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    mockTestConnection.mockResolvedValue({
      success: true,
      shopName: "My Shop",
    });

    const handler = getHandler(shopify.testShopifyConnection);
    const result = await handler(ctx, {
      domain: "myshop.myshopify.com",
      token: "shpat_token123",
    });

    expect(result).toEqual({ success: true, shopName: "My Shop" });
    expect(mockTestConnection).toHaveBeenCalledWith(
      "myshop.myshopify.com",
      "shpat_token123",
    );
  });

  it("returns failure from testConnection", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    mockTestConnection.mockResolvedValue({
      success: false,
      error: "Connection failed",
    });

    const handler = getHandler(shopify.testShopifyConnection);
    const result = await handler(ctx, {
      domain: "badshop.myshopify.com",
      token: "bad_token",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Connection failed");
  });
});

describe("shopify.syncProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and upserts products from Shopify", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(mockSite); // getSiteForSync
    ctx.runMutation.mockResolvedValue(undefined);

    const mockProducts = [
      {
        id: "gid://shopify/Product/1",
        handle: "product-a",
        title: "Product A",
        productType: "T-Shirt",
        vendor: "Brand",
        tags: ["tag1", "tag2"],
        availableForSale: true,
        featuredImage: { url: "https://img.com/a.jpg", altText: null },
        images: {
          edges: [
            {
              node: {
                id: "gid://shopify/ProductImage/1",
                url: "https://img.com/a.jpg",
                altText: null,
              },
            },
          ],
        },
        variants: {
          edges: [
            {
              node: {
                id: "gid://shopify/ProductVariant/100",
                title: "Default",
                sku: "SKU-A",
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
    mockFetchProducts.mockResolvedValue(mockProducts as any);

    const handler = getHandler(shopify.syncProducts);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual({ synced: 1 });
    expect(ctx.runQuery).toHaveBeenCalledWith(
      "internal:shopify:getSiteForSync",
      {
        siteId: "site_1",
      },
    );
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:upsertProduct",
      expect.objectContaining({
        siteId: "site_1",
        shopifyId: "gid://shopify/Product/1",
        handle: "product-a",
        title: "Product A",
        status: "active",
      }),
    );
    // Should also update sync timestamp
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:updateSyncTimestamp",
      { siteId: "site_1" },
    );
  });

  it("throws when Shopify is not configured", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(mockSiteNoShopify); // getSiteForSync

    const handler = getHandler(shopify.syncProducts);
    await expect(handler(ctx, { siteId: "site_2" })).rejects.toThrow(
      "Shopify is not configured for this site",
    );
  });

  it("throws when site is null", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(null); // getSiteForSync

    const handler = getHandler(shopify.syncProducts);
    await expect(handler(ctx, { siteId: "site_missing" })).rejects.toThrow(
      "Shopify is not configured for this site",
    );
  });

  it("maps price range from Storefront API response", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(mockSite); // getSiteForSync
    ctx.runMutation.mockResolvedValue(undefined);

    const mockProducts = [
      {
        id: "gid://shopify/Product/1",
        handle: "product-a",
        title: "Product A",
        productType: "",
        vendor: "",
        tags: [],
        availableForSale: true,
        featuredImage: null,
        images: { edges: [] },
        variants: {
          edges: [
            {
              node: {
                id: "gid://shopify/ProductVariant/100",
                title: "Small",
                sku: "",
                availableForSale: true,
                price: { amount: "19.99", currencyCode: "USD" },
                compareAtPrice: null,
              },
            },
            {
              node: {
                id: "gid://shopify/ProductVariant/101",
                title: "Large",
                sku: "",
                availableForSale: true,
                price: { amount: "39.99", currencyCode: "USD" },
                compareAtPrice: null,
              },
            },
          ],
        },
        priceRange: {
          minVariantPrice: { amount: "19.99", currencyCode: "USD" },
          maxVariantPrice: { amount: "39.99", currencyCode: "USD" },
        },
      },
    ];
    mockFetchProducts.mockResolvedValue(mockProducts as any);

    const handler = getHandler(shopify.syncProducts);
    await handler(ctx, { siteId: "site_1" });

    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:upsertProduct",
      expect.objectContaining({
        priceRange: { min: "19.99", max: "39.99" },
      }),
    );
  });
});

describe("shopify.syncCollections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and upserts collections from Shopify", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(mockSite); // getSiteForSync
    ctx.runMutation.mockResolvedValue(undefined);

    const mockCollections = [
      {
        id: "gid://shopify/Collection/10",
        handle: "spring",
        title: "Spring Collection",
        image: { url: "https://img.com/spring.jpg", altText: null },
      },
    ];
    mockFetchCollections.mockResolvedValue(mockCollections as any);

    const handler = getHandler(shopify.syncCollections);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual({ synced: 1 });
    expect(ctx.runMutation).toHaveBeenCalledWith(
      "internal:shopify:upsertCollection",
      expect.objectContaining({
        siteId: "site_1",
        shopifyId: "gid://shopify/Collection/10",
        handle: "spring",
        title: "Spring Collection",
        image: "https://img.com/spring.jpg",
        productsCount: 0,
      }),
    );
  });

  it("throws when Shopify is not configured", async () => {
    const ctx = createMockActionCtx();
    ctx.auth.getUserIdentity.mockResolvedValue(mockIdentity);
    ctx.runQuery
      .mockResolvedValueOnce(true) // verifySiteAccessForAction
      .mockResolvedValueOnce(mockSiteNoShopify); // getSiteForSync

    const handler = getHandler(shopify.syncCollections);
    await expect(handler(ctx, { siteId: "site_2" })).rejects.toThrow(
      "Shopify is not configured for this site",
    );
  });
});

describe("shopify.getSiteForSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the site by ID", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(mockSite);

    const handler = getHandler(shopify.getSiteForSync);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual(mockSite);
    expect(ctx.db.get).toHaveBeenCalledWith("site_1");
  });

  it("returns null when site not found", async () => {
    const ctx = createMockQueryCtx();
    ctx.db.get.mockResolvedValue(null);

    const handler = getHandler(shopify.getSiteForSync);
    const result = await handler(ctx, { siteId: "site_missing" });

    expect(result).toBeNull();
  });
});

describe("shopify.upsertProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const productArgs = {
    siteId: "site_1" as any,
    shopifyId: "1",
    handle: "product-a",
    title: "Product A",
    status: "active" as const,
    images: [],
    variants: [],
    tags: [],
    priceRange: { min: "0.00", max: "0.00" },
  };

  it("inserts a new product when not found", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null); // no existing product

    const handler = getHandler(shopify.upsertProduct);
    await handler(ctx, productArgs);

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifyProducts",
      expect.objectContaining({
        siteId: "site_1",
        shopifyId: "1",
        handle: "product-a",
        title: "Product A",
      }),
    );
    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("patches an existing product when found", async () => {
    const ctx = createMockMutationCtx();
    const existingProduct = { _id: "sp_1" };
    ctx._mocks.first.mockResolvedValue(existingProduct);

    const handler = getHandler(shopify.upsertProduct);
    await handler(ctx, productArgs);

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "sp_1",
      expect.objectContaining({
        siteId: "site_1",
        shopifyId: "1",
        handle: "product-a",
      }),
    );
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  it("queries with by_shopify_id index", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(shopify.upsertProduct);
    await handler(ctx, productArgs);

    expect(ctx.db.query).toHaveBeenCalledWith("shopifyProducts");
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_shopify_id",
      expect.any(Function),
    );
  });

  it("sets syncedAt timestamp", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const before = Date.now();
    const handler = getHandler(shopify.upsertProduct);
    await handler(ctx, productArgs);
    const after = Date.now();

    const insertData = ctx.db.insert.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(insertData.syncedAt).toBeGreaterThanOrEqual(before);
    expect(insertData.syncedAt).toBeLessThanOrEqual(after);
  });
});

describe("shopify.upsertCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const collectionArgs = {
    siteId: "site_1" as any,
    shopifyId: "10",
    handle: "spring",
    title: "Spring Collection",
    image: "https://img.com/spring.jpg",
    productsCount: 5,
  };

  it("inserts a new collection when not found", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(shopify.upsertCollection);
    await handler(ctx, collectionArgs);

    expect(ctx.db.insert).toHaveBeenCalledWith(
      "shopifyCollections",
      expect.objectContaining({
        siteId: "site_1",
        shopifyId: "10",
        handle: "spring",
        title: "Spring Collection",
      }),
    );
  });

  it("patches an existing collection when found", async () => {
    const ctx = createMockMutationCtx();
    ctx._mocks.first.mockResolvedValue({ _id: "sc_1" });

    const handler = getHandler(shopify.upsertCollection);
    await handler(ctx, collectionArgs);

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "sc_1",
      expect.objectContaining({
        shopifyId: "10",
      }),
    );
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });
});

describe("shopify.updateSyncTimestamp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("patches the site with shopifyLastSyncAt", async () => {
    const ctx = createMockMutationCtx();

    const before = Date.now();
    const handler = getHandler(shopify.updateSyncTimestamp);
    await handler(ctx, { siteId: "site_1" });
    const after = Date.now();

    const patchCall = ctx.db.patch.mock.calls[0];
    expect(patchCall[0]).toBe("site_1");
    const patchData = patchCall[1] as Record<string, unknown>;
    expect(patchData.shopifyLastSyncAt).toBeGreaterThanOrEqual(before);
    expect(patchData.shopifyLastSyncAt).toBeLessThanOrEqual(after);
  });
});

describe("shopify.listProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns products for the site", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    const mockProducts = [
      { _id: "sp_1", handle: "product-a", title: "Product A" },
    ];
    ctx._mocks.collect.mockResolvedValue(mockProducts);

    const handler = getHandler(shopify.listProducts);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toEqual(mockProducts);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_site",
      expect.any(Function),
    );
  });
});

describe("shopify.getProductByHandle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a product by handle", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    const mockProduct = {
      _id: "sp_1",
      handle: "product-a",
      title: "Product A",
    };
    ctx._mocks.first.mockResolvedValue(mockProduct);

    const handler = getHandler(shopify.getProductByHandle);
    const result = await handler(ctx, {
      siteId: "site_1",
      handle: "product-a",
    });

    expect(result).toEqual(mockProduct);
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_handle",
      expect.any(Function),
    );
  });

  it("returns null when product not found", async () => {
    const ctx = createMockQueryCtx();
    mockRequireSiteAccess.mockResolvedValue({
      user: mockUser,
      site: mockSite,
      role: "owner",
    } as any);
    ctx._mocks.first.mockResolvedValue(null);

    const handler = getHandler(shopify.getProductByHandle);
    const result = await handler(ctx, {
      siteId: "site_1",
      handle: "nonexistent",
    });

    expect(result).toBeNull();
  });
});

describe("shopify.listProductsInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns simplified product data", async () => {
    const ctx = createMockQueryCtx();
    const fullProducts = [
      {
        _id: "sp_1",
        handle: "product-a",
        title: "Product A",
        status: "active",
        featuredImage: "https://img.com/a.jpg",
        priceRange: { min: "19.99", max: "39.99" },
        variants: [
          { id: "1", title: "Default", available: true, price: "29.99" },
        ],
        images: [],
        tags: [],
      },
    ];
    ctx._mocks.collect.mockResolvedValue(fullProducts);

    const handler = getHandler(shopify.listProductsInternal);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      handle: "product-a",
      title: "Product A",
      status: "active",
      featuredImage: "https://img.com/a.jpg",
      priceRange: { min: "19.99", max: "39.99" },
      available: true,
    });
  });

  it("marks product as unavailable when no variants are available", async () => {
    const ctx = createMockQueryCtx();
    const products = [
      {
        _id: "sp_1",
        handle: "product-a",
        title: "Product A",
        status: "active",
        featuredImage: null,
        priceRange: { min: "0.00", max: "0.00" },
        variants: [
          { id: "1", title: "Default", available: false, price: "29.99" },
        ],
        images: [],
        tags: [],
      },
    ];
    ctx._mocks.collect.mockResolvedValue(products);

    const handler = getHandler(shopify.listProductsInternal);
    const result = await handler(ctx, { siteId: "site_1" });

    expect(result[0].available).toBe(false);
  });
});

describe("shopify.getProductByHandleInternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns product by handle without access check", async () => {
    const ctx = createMockQueryCtx();
    const mockProduct = { _id: "sp_1", handle: "product-a" };
    ctx._mocks.first.mockResolvedValue(mockProduct);

    const handler = getHandler(shopify.getProductByHandleInternal);
    const result = await handler(ctx, {
      siteId: "site_1",
      handle: "product-a",
    });

    expect(result).toEqual(mockProduct);
    expect(requireSiteAccess).not.toHaveBeenCalled();
    expect(ctx._mocks.withIndex).toHaveBeenCalledWith(
      "by_handle",
      expect.any(Function),
    );
  });
});
