import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { fetchCollections, fetchProducts, testConnection } from "./lib/shopify";

/**
 * Verify that the calling user has access to a site.
 * Used by actions which cannot use ctx.db directly.
 */
export const verifySiteAccessForAction = internalQuery({
  args: { siteId: v.id("sites"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return false;

    const site = await ctx.db.get(args.siteId);
    if (!site) return false;

    if (site.ownerId === user._id) return true;

    const access = await ctx.db
      .query("siteAccess")
      .withIndex("by_site_user", (q) =>
        q.eq("siteId", args.siteId).eq("userId", user._id),
      )
      .first();

    return !!access;
  },
});

/**
 * Test Shopify connection with provided credentials.
 * Requires the user to be logged in.
 */
export const testShopifyConnection = action({
  args: {
    domain: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    return await testConnection(args.domain, args.token);
  },
});

/**
 * Sync products from Shopify to the database.
 * Requires authenticated user with site access.
 */
export const syncProducts = action({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const hasAccess = await ctx.runQuery(
      internal.shopify.verifySiteAccessForAction,
      { siteId: args.siteId, clerkId: identity.subject },
    );
    if (!hasAccess) {
      throw new ConvexError("You don't have access to this site");
    }

    // Get site with Shopify credentials
    const site = await ctx.runQuery(internal.shopify.getSiteForSync, {
      siteId: args.siteId,
    });

    if (!site || !site.shopifyDomain || !site.shopifyToken) {
      throw new ConvexError("Shopify is not configured for this site");
    }

    // Fetch all products from Shopify
    const products = await fetchProducts(site.shopifyDomain, site.shopifyToken);

    // Upsert each product
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

    // Update last sync timestamp
    await ctx.runMutation(internal.shopify.updateSyncTimestamp, {
      siteId: args.siteId,
    });

    return { synced: products.length };
  },
});

/**
 * Sync collections from Shopify to the database.
 * Requires authenticated user with site access.
 */
export const syncCollections = action({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    const hasAccess = await ctx.runQuery(
      internal.shopify.verifySiteAccessForAction,
      { siteId: args.siteId, clerkId: identity.subject },
    );
    if (!hasAccess) {
      throw new ConvexError("You don't have access to this site");
    }

    const site = await ctx.runQuery(internal.shopify.getSiteForSync, {
      siteId: args.siteId,
    });

    if (!site || !site.shopifyDomain || !site.shopifyToken) {
      throw new ConvexError("Shopify is not configured for this site");
    }

    const collections = await fetchCollections(
      site.shopifyDomain,
      site.shopifyToken,
    );

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

    return { synced: collections.length };
  },
});

// === Internal queries/mutations ===

export const getSiteForSync = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.siteId);
  },
});

export const upsertProduct = internalMutation({
  args: {
    siteId: v.id("sites"),
    shopifyId: v.string(),
    handle: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("archived"),
    ),
    featuredImage: v.optional(v.string()),
    images: v.array(
      v.object({
        id: v.string(),
        src: v.string(),
        alt: v.optional(v.string()),
      }),
    ),
    variants: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        sku: v.optional(v.string()),
        price: v.string(),
        compareAtPrice: v.optional(v.string()),
        available: v.boolean(),
      }),
    ),
    productType: v.optional(v.string()),
    vendor: v.optional(v.string()),
    tags: v.array(v.string()),
    priceRange: v.object({ min: v.string(), max: v.string() }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shopifyProducts")
      .withIndex("by_shopify_id", (q) =>
        q.eq("siteId", args.siteId).eq("shopifyId", args.shopifyId),
      )
      .first();

    const data = {
      siteId: args.siteId,
      shopifyId: args.shopifyId,
      handle: args.handle,
      title: args.title,
      status: args.status,
      featuredImage: args.featuredImage,
      images: args.images,
      variants: args.variants,
      productType: args.productType,
      vendor: args.vendor,
      tags: args.tags,
      priceRange: args.priceRange,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("shopifyProducts", data);
    }
  },
});

export const upsertCollection = internalMutation({
  args: {
    siteId: v.id("sites"),
    shopifyId: v.string(),
    handle: v.string(),
    title: v.string(),
    image: v.optional(v.string()),
    productsCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shopifyCollections")
      .withIndex("by_shopify_id", (q) =>
        q.eq("siteId", args.siteId).eq("shopifyId", args.shopifyId),
      )
      .first();

    const data = {
      siteId: args.siteId,
      shopifyId: args.shopifyId,
      handle: args.handle,
      title: args.title,
      image: args.image,
      productsCount: args.productsCount,
      syncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("shopifyCollections", data);
    }
  },
});

export const updateSyncTimestamp = internalMutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.siteId, { shopifyLastSyncAt: Date.now() });
  },
});

// Public queries for products
export const listProducts = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);
    return await ctx.db
      .query("shopifyProducts")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

export const getProductByHandle = query({
  args: { siteId: v.id("sites"), handle: v.string() },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);
    return await ctx.db
      .query("shopifyProducts")
      .withIndex("by_handle", (q) =>
        q.eq("siteId", args.siteId).eq("handle", args.handle),
      )
      .first();
  },
});

// Public queries for collections
export const listCollections = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);
    return await ctx.db
      .query("shopifyCollections")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

export const getCollectionByHandle = query({
  args: { siteId: v.id("sites"), handle: v.string() },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);
    return await ctx.db
      .query("shopifyCollections")
      .withIndex("by_handle", (q) =>
        q.eq("siteId", args.siteId).eq("handle", args.handle),
      )
      .first();
  },
});

// Internal queries for HTTP API
export const listProductsInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("shopifyProducts")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return products.map((p) => ({
      handle: p.handle,
      title: p.title,
      status: p.status,
      featuredImage: p.featuredImage,
      priceRange: p.priceRange,
      available: p.variants.some((v) => v.available),
    }));
  },
});

export const getProductByHandleInternal = internalQuery({
  args: { siteId: v.id("sites"), handle: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopifyProducts")
      .withIndex("by_handle", (q) =>
        q.eq("siteId", args.siteId).eq("handle", args.handle),
      )
      .first();
  },
});

export const listCollectionsInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const collections = await ctx.db
      .query("shopifyCollections")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return collections.map((c) => ({
      handle: c.handle,
      title: c.title,
      image: c.image,
      productsCount: c.productsCount,
    }));
  },
});

export const getCollectionByHandleInternal = internalQuery({
  args: { siteId: v.id("sites"), handle: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopifyCollections")
      .withIndex("by_handle", (q) =>
        q.eq("siteId", args.siteId).eq("handle", args.handle),
      )
      .first();
  },
});
