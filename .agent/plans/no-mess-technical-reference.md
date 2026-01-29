# no-mess — Technical Reference

**Brand:** no-mess  
**Domain:** no-mess.xyz  

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Sites                      │
│            (Next.js, Remix, Astro, etc.)            │
└─────────────────────┬───────────────────────────────┘
                      │ @no-mess/client SDK
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Convex HTTP API                     │
│              (api.no-mess.convex.site)              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                    Convex DB                         │
│     users, sites, contentTypes, entries, assets     │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Admin Dashboard                     │
│                (admin.no-mess.xyz)                   │
│                    Next.js + Clerk                   │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Admin Frontend | Next.js 14+, React, Tailwind, shadcn/ui |
| Auth | Clerk (email/password only) |
| Backend | Convex |
| Database | Convex (built-in) |
| File Storage | Convex (built-in) |
| SDK | TypeScript, fetch |
| Deployment | Vercel (admin), Convex Cloud |

---

## Key Decisions

### Auth: Clerk (minimal)

**Why Clerk:**
- Fast to implement
- Handles email/password, magic link, password reset
- Webhook to sync users to Convex
- Good free tier

**Config:**
- Email/password only (no social login)
- No organizations (users have sites directly)

---

### No Organizations

**Decision:** Users own sites directly, no org layer.

**Why:**
- Simpler mental model
- Most users are solo devs or small teams
- Can add orgs later if needed

**Access model:**
```
User → owns → Site(s)
Site → has → siteAccess[] → User (editor role)
```

---

### Shopify: API Token (not OAuth)

**Decision:** Client pastes Admin API token from Shopify Custom App.

**Why:**
- No OAuth flow to build
- No Shopify Partner account needed
- No app review
- Token doesn't expire

**Tradeoff:**
- Client does 2 min setup in Shopify admin
- Worth it for the simplicity

---

### Preview: New Tab (not iframe)

**Decision:** Preview opens in new tab with secret param.

**Why:**
- No postMessage complexity
- No CSP/CORS issues
- Works everywhere

**How it works:**
1. Entry has "Preview" button
2. Opens: `{previewUrl}?preview=true&secret={previewSecret}&slug={slug}`
3. Client site checks secret, fetches draft content

---

### Field Types: Simple Set

**v1 types:**
- text, textarea, number, boolean, datetime, url, image, select

**Not in v1:**
- richText (just use textarea)
- array (can add later)
- object (can add later)
- reference (can add later)

---

## External Dependencies

### Convex Account
- **Needed for:** Everything
- **Setup:** convex.dev → create project → `npx convex dev`

### Clerk Account  
- **Needed for:** Auth
- **Setup:** clerk.com → create app → copy keys → configure webhook

### Shopify Custom App (per client)
- **Needed for:** Shopify sync
- **Setup:** Client creates in their Shopify admin
- **Scopes needed:** `read_products`, `read_collections`

---

## Environment Variables

### apps/admin

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=           # For CI/CD

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### packages/convex

```env
# Set in Convex dashboard, not .env
CLERK_WEBHOOK_SECRET=whsec_...
```

### Client site (example)

```env
NO_MESS_API_URL=https://your-project.convex.site
NO_MESS_API_KEY=nm_...
NO_MESS_PREVIEW_SECRET=      # Optional, for preview mode
```

---

## API Authentication

### Public API (SDK calls)

```
GET /api/content/blog-post/hello-world
Authorization: Bearer nm_abc123...
```

- API key generated per site
- Stored in `sites.apiKey`
- Validated on every request

### Preview Mode

```
GET /api/content/blog-post/hello-world?preview=true&secret=xyz
Authorization: Bearer nm_abc123...
```

- Preview secret generated per site
- Returns draft content instead of published
- Client site should gate this behind env var

---

## Shopify Sync

### Connection Flow

1. Client creates Custom App in Shopify Admin
2. Client grants `read_products` scope
3. Client copies Admin API access token
4. Dev pastes token into no-mess site settings
5. no-mess stores token (encrypted in prod)
6. Dev clicks "Sync Now"

### Sync Process

```typescript
// Pseudocode
async function syncProducts(site) {
  const client = new ShopifyClient(site.shopifyDomain, site.shopifyToken);
  
  for await (const product of client.getAllProducts()) {
    await db.upsertProduct({
      siteId: site._id,
      shopifyId: product.id,
      handle: product.handle,
      title: product.title,
      // ... denormalized fields
    });
  }
  
  await db.updateSite(site._id, { shopifyLastSyncAt: Date.now() });
}
```

### Rate Limiting

Shopify Admin API: 40 requests/second (leaky bucket)

Mitigation:
- Pagination (250 products/request)
- Exponential backoff on 429
- Most stores sync in < 1 minute

---

## Security Notes

### API Key Storage
- Keys prefixed with `nm_` for identification
- Generated with crypto.randomBytes(32)
- Stored hashed? Or plaintext? (TBD - probably plaintext for v1, hash later)

### Shopify Token Storage
- **Should encrypt at rest** for production
- Convex doesn't have native encryption
- Options: encrypt in app layer before storing, or accept risk for v1

### Preview Secret
- Separate from API key
- Only used for preview mode
- Can be rotated independently

---

## Known Limitations

| Limitation | Workaround |
|------------|------------|
| No real-time preview | Refresh preview tab manually |
| No rich text editor | Use textarea, add Tiptap in v2 |
| No version history | Manual backups for now |
| No scheduled publishing | Publish manually when ready |
| No webhooks on publish | Poll or use ISR with short TTL |
| 20MB file upload limit | Convex limitation, use external CDN for large files |

---

## SDK Usage

```typescript
import { createNoMessClient } from '@no-mess/client';

const client = createNoMessClient({
  apiUrl: process.env.NO_MESS_API_URL,
  apiKey: process.env.NO_MESS_API_KEY,
});

// Get single entry
const post = await client.getEntry<BlogPost>('blog-post', 'hello-world');

// Get all entries of a type
const posts = await client.getEntries<BlogPost>('blog-post');

// Preview mode
const draft = await client.getEntry<BlogPost>('blog-post', 'hello-world', {
  preview: true,
  previewSecret: process.env.NO_MESS_PREVIEW_SECRET,
});

// Shopify products
const products = await client.getProducts();
const product = await client.getProduct('cool-shirt');
```

---

## Deployment Checklist

### Pre-launch
- [ ] Convex production deployment created
- [ ] Clerk production instance created
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured (admin.no-mess.xyz)
- [ ] SSL working

### Post-launch monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Convex dashboard monitoring
- [ ] Basic uptime monitoring

