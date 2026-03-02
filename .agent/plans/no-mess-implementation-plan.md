# no-mess — Implementation Plan

**Brand:** no-mess (lowercase, hyphenated)
**Slug:** no-mess
**Domain:** no-mess.xyz

---

## Project Overview

A stupid-simple headless CMS that devs set up for clients. No mess.

**Core flow:**
```
Dev signs up → creates site → defines content types → invites client
Client logs in → edits content → publishes
Dev's site fetches via API key
```

**Features (v1):**
- Simple auth (Clerk, email/password & Google social login)
- Sites with API keys
- Content types (schema builder)
- Content entries with publish workflow
- Asset uploads (images, files)
- Preview (new tab)
- Shopify product sync (via pasted API token)
- TypeScript SDK (@no-mess/client)

**Explicitly not building (v1):**
- Organizations / multi-tenancy complexity
- Team roles beyond owner/editor
- Shopify OAuth app
- A/B testing
- Iframe live preview
- Rich text editor (use textarea, add later)
- Version history

---

## Project Structure

> **Note:** The actual project is a flat Next.js app (not a monorepo). Convex lives at `/convex`, components at `/components`, app routes at `/app`. The SDK is at `/packages/no-mess-client/`.

```
no-mess/
├── app/
│   ├── (auth)/           # Login, signup
│   ├── (dashboard)/
│   │   ├── sites/
│   │   │   ├── [siteSlug]/
│   │   │   │   ├── content/
│   │   │   │   ├── media/
│   │   │   │   ├── schemas/
│   │   │   │   ├── shopify/
│   │   │   │   └── settings/
│   │   │   └── page.tsx  # Sites list
│   │   └── page.tsx      # Dashboard home
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── dashboard/        # Sidebar, header
│   ├── sites/            # Site card, create dialog, settings
│   ├── content-types/    # Schema builder
│   ├── content-entries/  # Preview button, status badge
│   ├── dynamic-form/     # Dynamic form renderer + field components
│   └── assets/           # Upload, grid, picker
├── convex/
│   ├── schema.ts
│   ├── users.ts
│   ├── sites.ts
│   ├── siteAccess.ts
│   ├── contentTypes.ts
│   ├── contentEntries.ts
│   ├── assets.ts
│   ├── shopify.ts
│   ├── http.ts           # Public API + Clerk webhook
│   └── lib/
│       ├── auth.ts
│       ├── access.ts
│       ├── utils.ts
│       ├── validators.ts
│       ├── shopify.ts
│       ├── apiAuth.ts
│       └── apiResponse.ts
├── hooks/
│   ├── use-site.ts
│   ├── use-copy-to-clipboard.ts
│   └── use-mobile.ts
├── lib/
│   ├── utils.ts
│   └── convex.ts
├── packages/
│   └── no-mess-client/   # @no-mess/client SDK
└── middleware.ts
```

---

## Phase 0: Project Setup — COMPLETE

### 0.1 Repository Setup
- [x] ~~Initialize monorepo~~ → Flat Next.js app structure used instead
- [x] Next.js 16 app with App Router, React 19, React Compiler
- [x] Convex installed at `/convex`
- [x] SDK package at `/packages/no-mess-client`
- [x] TypeScript strict mode configured
- [x] Biome configured for linting and formatting (not ESLint/Prettier)

---

### 0.2 Convex Setup
- [x] Convex v1.31.7 installed
- [x] Schema defined in `/convex/schema.ts` (8 tables)
- [x] Environment variables configured

---

### 0.3 Auth Setup
- [x] Clerk installed (@clerk/nextjs)
- [x] Email/password configured
- [x] Clerk → Convex user sync webhook in `/convex/http.ts`
- [x] Protected route middleware in `/middleware.ts`
- [x] ConvexProviderWithClerk in `/components/providers.tsx`

---

### 0.4 Admin App Scaffolding
- [x] Tailwind CSS v4 with OKLCH theme
- [x] shadcn/ui installed (23+ components)
- [x] Base dashboard layout with sidebar
- [x] Loading/error components
- [x] Convex React provider configured

---

## Phase 1: Core CMS — COMPLETE

### 1.1 Users Table
- [x] Implement `users` table (clerkId, email, name, avatarUrl)
- [x] Create user sync from Clerk webhook (`/convex/users.ts`)
- [x] Query current user helper (`/convex/lib/auth.ts`)

---

### 1.2 Sites
- [x] Implement `sites` table schema
- [x] Generate API key on site creation (nm_ prefix + 32 hex)
- [x] Generate preview secret on site creation
- [x] Create site CRUD mutations (`/convex/sites.ts`)
- [x] Build sites list page (`/app/(dashboard)/page.tsx`)
- [x] Build create site dialog (`/components/sites/create-site-dialog.tsx`)
- [x] Build site settings page (`/app/(dashboard)/sites/[siteSlug]/settings/page.tsx`)
- [x] Implement site deletion (cascade deletes all related data)

---

### 1.3 Site Access
- [x] Implement `siteAccess` table (siteId, userId, role: editor)
- [x] Create invite user mutation (`/convex/siteAccess.ts`)
- [x] Access check helpers (`/convex/lib/access.ts`)
- [x] Team members integrated in settings

---

### 1.4 Content Types
- [x] Implement `contentTypes` table
- [x] Define field type system (text, textarea, number, boolean, datetime, url, image, select, shopifyProduct)
- [x] Create content type CRUD mutations (`/convex/contentTypes.ts`)
- [x] Build content types list page (`/app/(dashboard)/sites/[siteSlug]/schemas/page.tsx`)
- [x] Build content type editor (`/components/content-types/content-type-form.tsx`)
- [x] Field reordering support

---

### 1.5 Content Entries
- [x] Implement `contentEntries` table
- [x] Create entry CRUD mutations (`/convex/contentEntries.ts`)
- [x] Implement slug generation from title
- [x] Build entries list page (`/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/page.tsx`)
- [x] Build entry editor page (`/app/(dashboard)/sites/[siteSlug]/content/[typeSlug]/[entrySlug]/page.tsx`)

---

### 1.6 Dynamic Form Renderer
- [x] Create `DynamicForm` component (`/components/dynamic-form/dynamic-form.tsx`)
- [x] Implement text field renderer
- [x] Implement textarea field renderer
- [x] Implement number field renderer
- [x] Implement boolean field renderer
- [x] Implement datetime field renderer
- [x] Implement url field renderer
- [x] Implement select field renderer
- [x] Implement image field renderer with asset picker
- [x] Implement shopifyProduct field with product picker
- [x] Add required field validation
- [x] Add field descriptions/help text
- [x] FormContext for passing siteId to nested field components

---

### 1.7 Publish Workflow
- [x] Add `published` and `draft` fields to entries
- [x] Add `status` field (draft | published)
- [x] Create publish mutation
- [x] Create unpublish mutation
- [x] Build status badge component
- [x] Build publish/unpublish buttons
- [x] Track publishedAt timestamp

---

### 1.8 Assets
- [x] Implement `assets` table
- [x] Configure Convex file storage
- [x] Create upload mutation (3-step: generateUploadUrl → POST → create record)
- [x] Extract image dimensions on upload
- [x] Build media library page (`/app/(dashboard)/sites/[siteSlug]/media/page.tsx`)
- [x] Build upload dropzone component (`/components/assets/upload-dropzone.tsx`)
- [x] Build asset picker modal (`/components/assets/asset-picker-dialog.tsx`)
- [x] Implement asset deletion

---

## Phase 2: API & SDK — COMPLETE

### 2.1 HTTP API
- [x] Set up Convex HTTP router (`/convex/http.ts`)
- [x] Implement API key validation (`/convex/lib/apiAuth.ts`)
- [x] Create `GET /api/content/:type` endpoint (list)
- [x] Create `GET /api/content/:type/:slug` endpoint (single)
- [x] Add published-only filter (default)
- [x] Add preview mode (with secret)
- [x] Return proper error responses (`/convex/lib/apiResponse.ts`)

---

### 2.2 TypeScript SDK
- [x] Set up package at `/packages/no-mess-client/`
- [x] Implement `createNoMessClient(config)` (`/packages/no-mess-client/src/index.ts`)
- [x] Implement `client.getEntry<T>(type, slug)`
- [x] Implement `client.getEntries<T>(type)`
- [x] Implement `client.getProducts()`, `client.getProduct(handle)`
- [x] Add preview mode support
- [x] Add TypeScript generics for content types
- [x] 8 unit tests passing (`/packages/no-mess-client/src/__tests__/client.test.ts`)

---

### 2.3 Preview
- [x] Preview URL field in site settings
- [x] Generate preview links for entries
- [x] Preview button opens new tab with preview secret (`/components/content-entries/preview-button.tsx`)

---

## Phase 3: Shopify Sync — COMPLETE

### 3.1 Shopify Connection UI
- [x] Shopify section in site settings (`/app/(dashboard)/sites/[siteSlug]/shopify/page.tsx`)
- [x] Store domain field
- [x] Admin API access token field
- [x] Test Connection button
- [x] Connection status display

---

### 3.2 Shopify API Client
- [x] Create Shopify Admin REST API client (`/convex/lib/shopify.ts`)
- [x] Implement `fetchProducts()` with pagination (250/page)
- [x] Implement `fetchCollections()` with pagination
- [x] Handle rate limiting (exponential backoff on 429)

---

### 3.3 Product Sync
- [x] Implement `shopifyProducts` table
- [x] Create sync products action (`/convex/shopify.ts`)
- [x] Denormalize product data (id, handle, title, images, variants, price range, tags)
- [x] Sync Now button
- [x] Show last sync timestamp
- [x] Show sync result count
- [x] Handle sync errors gracefully

---

### 3.4 Collection Sync
- [x] Implement `shopifyCollections` table
- [x] Create sync collections action

---

### 3.5 Shopify Data in API
- [x] Add `GET /api/shopify/products` endpoint
- [x] Add `GET /api/shopify/products/:handle` endpoint
- [x] Add `GET /api/shopify/collections` endpoint
- [x] Add `GET /api/shopify/collections/:handle` endpoint
- [x] SDK: `client.getProducts()`, `client.getProduct(handle)`, `client.getCollections()`, `client.getCollection(handle)`

---

### 3.6 Shopify Field Type
- [x] `shopifyProduct` field type in schema
- [x] Product picker component with search (`/components/dynamic-form/fields/shopify-product-field.tsx`)
- [x] Store product handle as reference

---

## Phase 4: Polish & Launch — COMPLETE (code portion)

### 4.1 Dashboard
- [x] Site dashboard with content stats (types, entries, assets, products)
- [x] Published/draft breakdown
- [x] Quick actions links
- [x] Shopify sync status display

---

### 4.2 Error Handling
- [x] Error boundary (`/app/(dashboard)/error.tsx`)
- [x] Toast notifications (sonner `<Toaster />`)
- [x] Loading states (`/app/(dashboard)/loading.tsx`, `sites/[siteSlug]/loading.tsx`)

---

### 4.3 Example Site
- [ ] Create Next.js example in examples/
- [ ] Install @no-mess/client
- [ ] Fetch and display content
- [ ] Show preview mode setup
- [ ] Document in README

---

### 4.4 Documentation
- [ ] Write getting started guide
- [ ] Document content type field types
- [ ] Document SDK usage
- [ ] Document Shopify setup (Custom App creation)
- [ ] Document preview mode setup
- [ ] Add inline help in admin UI

---

### 4.5 Deployment
- [ ] Deploy admin to Vercel (admin.no-mess.xyz)
- [ ] Deploy Convex to production
- [ ] Set up custom domain
- [ ] Configure production environment variables
- [ ] Set up error monitoring (Sentry)

---

## Dependency Graph

```
Phase 0 (Setup)        ✅
    │
    ▼
Phase 1 (Core CMS)    ✅
    │
    ├──────────────┐
    ▼              ▼
Phase 2 (API)    Phase 3 (Shopify)
    ✅              ✅
    │              │
    └──────┬───────┘
           ▼
    Phase 4 (Polish)   ✅ (code complete, docs/deploy remaining)
```

---

## Verification Results

```
bun run lint          ✅ 0 errors, 23 warnings (pre-existing shadcn)
bunx tsc --noEmit     ✅ 0 type errors
bun run test          ✅ 26/26 tests pass (10 backend + 8 SDK + 8 other)
bun run build         ✅ Next.js build succeeds (15 routes)
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shopify API rate limits | Medium | Implemented exponential backoff + pagination |
| Large asset uploads | Low | Convex has 20MB limit, document it |
| Preview CORS issues | Medium | Document required headers for client sites |

---

## Out of Scope (v2+)

- Organizations / workspaces
- Granular permissions
- A/B testing (PostHog integration)
- Iframe live preview with postMessage
- Rich text editor (Tiptap)
- Version history / rollback
- Scheduled publishing
- Webhooks on publish
- Shopify real-time webhooks
- Content templates
- Bulk operations
- Import/export

---

## Notes

- npm package: @no-mess/client
- Domain: no-mess.xyz
- Admin: admin.no-mess.xyz
- Keep it simple. Ship fast. Add complexity later.
