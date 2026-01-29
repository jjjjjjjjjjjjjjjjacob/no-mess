# no-mess — Data Model

**Brand:** no-mess  
**Domain:** no-mess.xyz  

---

## Entity Relationships

```
┌─────────┐
│  users  │
└────┬────┘
     │ 1:N (owner)
     │ N:M (via siteAccess)
     ▼
┌─────────┐       ┌─────────────┐
│  sites  │◄──────│ siteAccess  │
└────┬────┘       └─────────────┘
     │
     ├─── 1:N ───► contentTypes ───► 1:N ───► contentEntries
     │
     ├─── 1:N ───► assets
     │
     ├─── 1:N ───► shopifyProducts
     │
     └─── 1:N ───► shopifyCollections
```

---

## Tables

### users

Synced from Clerk via webhook.

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| clerkId | string | Clerk user ID |
| email | string | User email |
| name | string | Display name |
| avatarUrl | string? | Profile image URL |
| createdAt | number | Timestamp |

**Indexes:**
- `by_clerk` → [clerkId]
- `by_email` → [email]

---

### sites

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| ownerId | Id\<users\> | Site owner |
| name | string | Display name |
| slug | string | URL identifier |
| apiKey | string | For SDK authentication |
| previewSecret | string | For preview mode |
| previewUrl | string? | Client site URL for preview |
| shopifyDomain | string? | mystore.myshopify.com |
| shopifyToken | string? | Admin API access token |
| shopifyLastSyncAt | number? | Last sync timestamp |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:**
- `by_owner` → [ownerId]
- `by_slug` → [slug]
- `by_api_key` → [apiKey]

---

### siteAccess

Grants non-owners access to a site.

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Site reference |
| userId | Id\<users\> | User reference |
| role | "editor" | Permission level |
| invitedBy | Id\<users\> | Who invited |
| invitedAt | number | Timestamp |
| acceptedAt | number? | When accepted |

**Indexes:**
- `by_site` → [siteId]
- `by_user` → [userId]
- `by_site_user` → [siteId, userId]

**Notes:**
- Owner is stored on `sites.ownerId`, not here
- Only "editor" role for v1 (can edit content, can't delete site)

---

### contentTypes

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Parent site |
| name | string | Display name (e.g., "Blog Post") |
| slug | string | API identifier (e.g., "blog-post") |
| description | string? | Help text |
| fields | Field[] | Schema definition |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |

**Indexes:**
- `by_site` → [siteId]
- `by_slug` → [siteId, slug]

**Field type:**
```typescript
type Field = {
  name: string;           // "title", "heroImage", etc.
  type: FieldType;
  required: boolean;
  description?: string;   // Help text shown in form
  options?: {
    // For select type
    choices?: { label: string; value: string }[];
  };
};

type FieldType = 
  | "text"       // Single line input
  | "textarea"   // Multi-line input
  | "number"     // Number input
  | "boolean"    // Toggle switch
  | "datetime"   // Date/time picker
  | "url"        // URL input with validation
  | "image"      // Asset picker (images only)
  | "select"     // Dropdown with predefined options
  | "shopifyProduct";  // Shopify product picker
```

---

### contentEntries

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Parent site |
| contentTypeId | Id\<contentTypes\> | Schema reference |
| title | string | Display title in admin |
| slug | string | URL identifier |
| draft | any | Current draft content (JSON) |
| published | any? | Published content (JSON) |
| status | "draft" \| "published" | Current state |
| createdAt | number | Timestamp |
| createdBy | Id\<users\> | Author |
| updatedAt | number | Timestamp |
| updatedBy | Id\<users\> | Last editor |
| publishedAt | number? | When published |
| publishedBy | Id\<users\>? | Who published |

**Indexes:**
- `by_site` → [siteId]
- `by_type` → [contentTypeId]
- `by_slug` → [siteId, contentTypeId, slug]
- `by_status` → [siteId, status]

**Content structure:**
```typescript
// draft and published are JSON objects matching the contentType fields
{
  title: "Hello World",
  heroImage: "asset_id_123",  // Reference to assets table
  body: "Lorem ipsum...",
  featured: true,
}
```

---

### assets

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Parent site |
| storageId | Id\<_storage\> | Convex file storage reference |
| filename | string | Original filename |
| mimeType | string | File type |
| size | number | Size in bytes |
| width | number? | Image width (if image) |
| height | number? | Image height (if image) |
| url | string | Public URL |
| uploadedAt | number | Timestamp |
| uploadedBy | Id\<users\> | Uploader |

**Indexes:**
- `by_site` → [siteId]

---

### shopifyProducts

Synced from Shopify Admin API.

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Parent site |
| shopifyId | string | Shopify product ID |
| handle | string | URL slug |
| title | string | Product name |
| status | "active" \| "draft" \| "archived" | Shopify status |
| featuredImage | string? | Main image URL |
| images | Image[] | All product images |
| variants | Variant[] | Product variants |
| productType | string? | Product category |
| vendor | string? | Brand |
| tags | string[] | Product tags |
| priceRange | { min: string; max: string } | Price range |
| syncedAt | number | Last sync timestamp |

**Indexes:**
- `by_site` → [siteId]
- `by_shopify_id` → [siteId, shopifyId]
- `by_handle` → [siteId, handle]

**Nested types:**
```typescript
type Image = {
  id: string;
  src: string;
  alt?: string;
};

type Variant = {
  id: string;
  title: string;
  sku?: string;
  price: string;
  compareAtPrice?: string;
  available: boolean;
};
```

---

### shopifyCollections

| Field | Type | Description |
|-------|------|-------------|
| _id | Id | Auto-generated |
| siteId | Id\<sites\> | Parent site |
| shopifyId | string | Shopify collection ID |
| handle | string | URL slug |
| title | string | Collection name |
| image | string? | Collection image URL |
| productsCount | number | Number of products |
| syncedAt | number | Last sync timestamp |

**Indexes:**
- `by_site` → [siteId]
- `by_shopify_id` → [siteId, shopifyId]
- `by_handle` → [siteId, handle]

---

## Common Queries

### Get user's sites
```typescript
// Sites they own
const owned = await ctx.db
  .query("sites")
  .withIndex("by_owner", q => q.eq("ownerId", userId))
  .collect();

// Sites they have access to
const access = await ctx.db
  .query("siteAccess")
  .withIndex("by_user", q => q.eq("userId", userId))
  .collect();

const accessedSites = await Promise.all(
  access.map(a => ctx.db.get(a.siteId))
);
```

### Get site by API key
```typescript
const site = await ctx.db
  .query("sites")
  .withIndex("by_api_key", q => q.eq("apiKey", apiKey))
  .first();
```

### Get published entry
```typescript
const entry = await ctx.db
  .query("contentEntries")
  .withIndex("by_slug", q => 
    q.eq("siteId", siteId)
     .eq("contentTypeId", typeId)
     .eq("slug", slug)
  )
  .first();

// Return published content (or draft if preview mode)
const content = preview ? entry.draft : entry.published;
```

### Get content type by slug
```typescript
const type = await ctx.db
  .query("contentTypes")
  .withIndex("by_slug", q => 
    q.eq("siteId", siteId)
     .eq("slug", typeSlug)
  )
  .first();
```

### Get all entries of a type
```typescript
const entries = await ctx.db
  .query("contentEntries")
  .withIndex("by_type", q => q.eq("contentTypeId", typeId))
  .filter(q => q.eq(q.field("status"), "published"))
  .collect();
```

---

## API Response Shapes

### GET /api/content/:type/:slug

```json
{
  "slug": "hello-world",
  "title": "Hello World",
  "heroImage": {
    "url": "https://...",
    "width": 1200,
    "height": 630
  },
  "body": "Lorem ipsum...",
  "featured": true
}
```

### GET /api/content/:type

```json
[
  {
    "slug": "hello-world",
    "title": "Hello World",
    ...
  },
  {
    "slug": "another-post",
    "title": "Another Post",
    ...
  }
]
```

### GET /api/shopify/products

```json
[
  {
    "handle": "cool-shirt",
    "title": "Cool Shirt",
    "featuredImage": "https://...",
    "priceRange": { "min": "29.00", "max": "39.00" },
    "available": true
  }
]
```

---

## Convex Schema (TypeScript)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk", ["clerkId"])
    .index("by_email", ["email"]),

  sites: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    apiKey: v.string(),
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
    .index("by_api_key", ["apiKey"]),

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
    description: v.optional(v.string()),
    fields: v.array(v.object({
      name: v.string(),
      type: v.union(
        v.literal("text"),
        v.literal("textarea"),
        v.literal("number"),
        v.literal("boolean"),
        v.literal("datetime"),
        v.literal("url"),
        v.literal("image"),
        v.literal("select"),
        v.literal("shopifyProduct")
      ),
      required: v.boolean(),
      description: v.optional(v.string()),
      options: v.optional(v.object({
        choices: v.optional(v.array(v.object({
          label: v.string(),
          value: v.string(),
        }))),
      })),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_site", ["siteId"])
    .index("by_slug", ["siteId", "slug"]),

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

  assets: defineTable({
    siteId: v.id("sites"),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    url: v.string(),
    uploadedAt: v.number(),
    uploadedBy: v.id("users"),
  })
    .index("by_site", ["siteId"]),

  shopifyProducts: defineTable({
    siteId: v.id("sites"),
    shopifyId: v.string(),
    handle: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("draft"),
      v.literal("archived")
    ),
    featuredImage: v.optional(v.string()),
    images: v.array(v.object({
      id: v.string(),
      src: v.string(),
      alt: v.optional(v.string()),
    })),
    variants: v.array(v.object({
      id: v.string(),
      title: v.string(),
      sku: v.optional(v.string()),
      price: v.string(),
      compareAtPrice: v.optional(v.string()),
      available: v.boolean(),
    })),
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
});
```
