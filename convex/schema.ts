import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
    scheduledDeletionId: v.optional(v.string()),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_email", ["email"]),

  sites: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    apiKey: v.string(),
    publishableKey: v.optional(v.string()),
    previewSecret: v.string(),
    previewUrl: v.optional(v.string()),
    shopifyDomain: v.optional(v.string()),
    shopifyToken: v.optional(v.string()),
    shopifyLastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_api_key", ["apiKey"])
    .index("by_publishable_key", ["publishableKey"]),

  siteAccess: defineTable({
    siteId: v.id("sites"),
    userId: v.id("users"),
    role: v.literal("editor"),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_site", ["siteId"])
    .index("by_user", ["userId"])
    .index("by_site_user", ["siteId", "userId"]),

  contentTypes: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    slug: v.string(),
    kind: v.optional(v.union(v.literal("template"), v.literal("fragment"))),
    mode: v.optional(v.union(v.literal("singleton"), v.literal("collection"))),
    route: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.any(),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    draft: v.optional(v.any()),
    publishedAt: v.optional(v.number()),
    draftUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_slug", ["siteId", "slug"])
    .index("by_status", ["siteId", "status"]),

  contentEntries: defineTable({
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
    title: v.string(),
    slug: v.string(),
    draft: v.any(),
    published: v.optional(v.any()),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.id("users")),
  })
    .index("by_site", ["siteId"])
    .index("by_type", ["contentTypeId"])
    .index("by_slug", ["siteId", "contentTypeId", "slug"])
    .index("by_status", ["siteId", "status"]),

  contentEntryDrafts: defineTable({
    siteId: v.id("sites"),
    entryId: v.id("contentEntries"),
    name: v.string(),
    nameLower: v.string(),
    title: v.string(),
    draft: v.any(),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_site", ["siteId"])
    .index("by_entry", ["entryId"])
    .index("by_entry_name_lower", ["entryId", "nameLower"]),

  contentEntryRoutes: defineTable({
    siteId: v.id("sites"),
    entryId: v.id("contentEntries"),
    url: v.string(),
    source: v.union(v.literal("discovered"), v.literal("manual")),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastSelectedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_entry", ["entryId"])
    .index("by_entry_url", ["entryId", "url"]),

  assets: defineTable({
    siteId: v.id("sites"),
    storageId: v.id("_storage"),
    checksum: v.optional(v.string()),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    url: v.string(),
    uploadedAt: v.number(),
    uploadedBy: v.id("users"),
    // Image optimization fields
    optimizedStorageId: v.optional(v.id("_storage")),
    optimizedUrl: v.optional(v.string()),
    optimizedSize: v.optional(v.number()),
    optimizedMimeType: v.optional(v.string()),
    optimizationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("skipped"),
      ),
    ),
    optimizationError: v.optional(v.string()),
  })
    .index("by_site", ["siteId"])
    .index("by_site_checksum", ["siteId", "checksum"])
    .index("by_optimization_status", ["optimizationStatus"]),

  assetVariants: defineTable({
    assetId: v.id("assets"),
    storageId: v.id("_storage"),
    url: v.string(),
    width: v.number(),
    height: v.number(),
    mimeType: v.string(),
    size: v.number(),
    generatedAt: v.number(),
  }).index("by_asset", ["assetId"]),

  shopifyProducts: defineTable({
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
    priceRange: v.object({
      min: v.string(),
      max: v.string(),
    }),
    syncedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_shopify_id", ["siteId", "shopifyId"])
    .index("by_handle", ["siteId", "handle"]),

  shopifyCollections: defineTable({
    siteId: v.id("sites"),
    shopifyId: v.string(),
    handle: v.string(),
    title: v.string(),
    image: v.optional(v.string()),
    productsCount: v.number(),
    syncedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_shopify_id", ["siteId", "shopifyId"])
    .index("by_handle", ["siteId", "handle"]),

  previewSessions: defineTable({
    sessionId: v.string(),
    siteId: v.id("sites"),
    entryId: v.id("contentEntries"),
    contentTypeSlug: v.string(),
    entrySlug: v.string(),
    sessionSecret: v.string(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_site", ["siteId"])
    .index("by_expiry", ["expiresAt"]),

  shopifySyncCycles: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("completed_with_errors"),
      v.literal("skipped"),
    ),
    trigger: v.union(v.literal("cron"), v.literal("manual")),
    totalSites: v.number(),
    completedSites: v.number(),
    failedSites: v.number(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_started_at", ["startedAt"]),

  shopifySyncLogs: defineTable({
    cycleId: v.id("shopifySyncCycles"),
    siteId: v.id("sites"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    productsCount: v.optional(v.number()),
    collectionsCount: v.optional(v.number()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    retryCount: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_site", ["siteId"])
    .index("by_cycle_status", ["cycleId", "status"]),
});
