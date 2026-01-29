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

```
no-mess/
├── apps/
│   └── admin/                    # Next.js admin dashboard
│       ├── app/
│       │   ├── (auth)/           # Login, signup
│       │   ├── (dashboard)/
│       │   │   ├── sites/
│       │   │   │   ├── [siteSlug]/
│       │   │   │   │   ├── content/
│       │   │   │   │   ├── media/
│       │   │   │   │   ├── schemas/
│       │   │   │   │   ├── shopify/
│       │   │   │   │   └── settings/
│       │   │   │   └── new/
│       │   │   └── page.tsx      # Sites list
│       ├── components/
│       └── lib/
│
├── packages/
│   ├── convex/                   # Convex backend
│   │   ├── schema.ts
│   │   ├── sites.ts
│   │   ├── content.ts
│   │   ├── assets.ts
│   │   ├── shopify.ts
│   │   └── http.ts               # Public API
│   │
│   └── client/                   # SDK for client sites
│       ├── src/
│       │   ├── index.ts
│       │   └── client.ts
│       └── package.json
│
└── examples/
    └── nextjs-site/              # Reference implementation
```

---

## Phase 0: Project Setup

### 0.1 Repository Setup
- [ ] Initialize monorepo (pnpm workspaces + Turborepo)
- [ ] Create `apps/admin` Next.js app
- [ ] Create `packages/convex` 
- [ ] Create `packages/client` (@no-mess/client)
- [ ] Configure shared TypeScript config
- [ ] Configure ESLint/Prettier

**Blockers:** None

---

### 0.2 Convex Setup
- [ ] Initialize Convex project
- [ ] Set up development deployment
- [ ] Configure environment variables

**Blockers:** Convex account

---

### 0.3 Auth Setup
- [ ] Create Clerk application
- [ ] Install Clerk in admin app
- [ ] Configure email/password
- [ ] Configure Google social login
- [ ] Set up Clerk webhook to sync users to Convex
- [ ] Create protected route middleware

**Blockers:** Clerk account

---

### 0.4 Admin App Scaffolding  
- [ ] Install Tailwind CSS
- [ ] Install shadcn/ui
- [ ] Create base layout with sidebar
- [ ] Create loading/error components
- [ ] Set up Convex React provider

**Blockers:** 0.1, 0.2, 0.3

---

## Phase 1: Core CMS

### 1.1 Users Table
- [ ] Implement `users` table (clerkId, email, name)
- [ ] Create user sync from Clerk webhook
- [ ] Query current user helper

**Blockers:** 0.3

---

### 1.2 Sites
- [ ] Implement `sites` table schema
- [ ] Generate API key on site creation
- [ ] Generate preview secret on site creation
- [ ] Create site CRUD mutations
- [ ] Build sites list page
- [ ] Build create site page
- [ ] Build site settings page
- [ ] Implement site deletion

**Blockers:** 1.1

---

### 1.3 Site Access
- [ ] Implement `siteAccess` table (siteId, userId, role: owner|editor)
- [ ] Create invite user mutation (by email)
- [ ] Create accept invite flow
- [ ] Build team members list in settings
- [ ] Build invite modal

**Blockers:** 1.2

---

### 1.4 Content Types
- [ ] Implement `contentTypes` table
- [ ] Define field type system
- [ ] Create content type CRUD mutations
- [ ] Build content types list page
- [ ] Build content type editor (add/edit/remove fields)
- [ ] Implement field reordering

**Field types (v1):**
- text (single line)
- textarea (multi line)
- number
- boolean (toggle)
- datetime
- url
- image (reference to asset)
- select (dropdown with options)

**Blockers:** 1.2

---

### 1.5 Content Entries
- [ ] Implement `contentEntries` table
- [ ] Create entry CRUD mutations
- [ ] Implement slug generation
- [ ] Build entries list page (per content type)
- [ ] Build entry editor page
- [ ] Implement auto-save

**Blockers:** 1.4

---

### 1.6 Dynamic Form Renderer
- [ ] Create `DynamicForm` component
- [ ] Implement text field renderer
- [ ] Implement textarea field renderer
- [ ] Implement number field renderer
- [ ] Implement boolean field renderer
- [ ] Implement datetime field renderer
- [ ] Implement url field renderer
- [ ] Implement select field renderer
- [ ] Implement image field renderer (with asset picker)
- [ ] Add required field validation
- [ ] Add field descriptions/help text

**Blockers:** 1.4

---

### 1.7 Publish Workflow
- [ ] Add `published` and `draft` fields to entries
- [ ] Add `status` field (draft | published)
- [ ] Create publish mutation
- [ ] Create unpublish mutation
- [ ] Build status badge component
- [ ] Build publish/unpublish buttons
- [ ] Track publishedAt timestamp

**Blockers:** 1.5

---

### 1.8 Assets
- [ ] Implement `assets` table
- [ ] Configure Convex file storage
- [ ] Create upload mutation
- [ ] Extract image dimensions on upload
- [ ] Build media library page
- [ ] Build upload dropzone component
- [ ] Build asset picker modal (for image fields)
- [ ] Implement asset deletion

**Blockers:** 1.2

---

## Phase 2: API & SDK

### 2.1 HTTP API
- [ ] Set up Convex HTTP router
- [ ] Implement API key validation middleware
- [ ] Create `GET /api/content/:type` endpoint (list)
- [ ] Create `GET /api/content/:type/:slug` endpoint (single)
- [ ] Add published-only filter (default)
- [ ] Add preview mode (with secret)
- [ ] Add cache headers
- [ ] Return proper error responses

**Blockers:** 1.7

---

### 2.2 TypeScript SDK
- [ ] Set up package with TypeScript
- [ ] Implement `createNoMessClient(config)`
- [ ] Implement `client.getEntry<T>(type, slug)`
- [ ] Implement `client.getEntries<T>(type)`
- [ ] Add preview mode support
- [ ] Add TypeScript generics for content types
- [ ] Write README with usage examples
- [ ] Publish to npm as @no-mess/client

**Blockers:** 2.1

---

### 2.3 Preview
- [ ] Add preview URL field to site settings
- [ ] Generate preview links for entries
- [ ] Create "Preview" button that opens new tab with preview secret
- [ ] Document how client sites enable preview mode

**Blockers:** 2.1

---

## Phase 3: Shopify Sync

### 3.1 Shopify Connection UI
- [ ] Add Shopify section to site settings
- [ ] Add field for store domain (mystore.myshopify.com)
- [ ] Add field for Admin API access token
- [ ] Add "Test Connection" button
- [ ] Show connection status
- [ ] Document how client creates Custom App in Shopify

**Blockers:** 1.2

---

### 3.2 Shopify API Client
- [ ] Create Shopify Admin API client
- [ ] Implement `getProducts()` with pagination
- [ ] Implement `getCollections()` with pagination
- [ ] Handle rate limiting (retry with backoff)

**Blockers:** None

---

### 3.3 Product Sync
- [ ] Implement `shopifyProducts` table
- [ ] Create sync products mutation
- [ ] Denormalize product data (id, handle, title, images, variants, etc.)
- [ ] Add "Sync Now" button
- [ ] Show last sync timestamp
- [ ] Show sync progress/status
- [ ] Handle sync errors gracefully

**Blockers:** 3.1, 3.2

---

### 3.4 Collection Sync
- [ ] Implement `shopifyCollections` table
- [ ] Create sync collections mutation
- [ ] Denormalize collection data

**Blockers:** 3.3

---

### 3.5 Shopify Data in API
- [ ] Add `GET /api/shopify/products` endpoint
- [ ] Add `GET /api/shopify/products/:handle` endpoint
- [ ] Add `GET /api/shopify/collections` endpoint
- [ ] Add to SDK: `client.getProducts()`, `client.getProduct(handle)`

**Blockers:** 3.3, 2.1

---

### 3.6 Shopify Field Type
- [ ] Add `shopifyProduct` field type
- [ ] Build product picker component (search + select)
- [ ] Store product reference (shopifyId or handle)
- [ ] Resolve product data in API response

**Blockers:** 3.3, 1.6

---

## Phase 4: Polish & Launch

### 4.1 Dashboard
- [ ] Build site dashboard with content stats
- [ ] Show recent activity
- [ ] Show Shopify sync status

**Blockers:** All Phase 1-3

---

### 4.2 Error Handling
- [ ] Add error boundaries
- [ ] Add toast notifications
- [ ] Improve form validation messages
- [ ] Add loading states everywhere

**Blockers:** None

---

### 4.3 Example Site
- [ ] Create Next.js example in examples/
- [ ] Install @no-mess/client
- [ ] Fetch and display content
- [ ] Show preview mode setup
- [ ] Document in README

**Blockers:** 2.2

---

### 4.4 Documentation
- [ ] Write getting started guide
- [ ] Document content type field types
- [ ] Document SDK usage
- [ ] Document Shopify setup (Custom App creation)
- [ ] Document preview mode setup
- [ ] Add inline help in admin UI

**Blockers:** All features complete

---

### 4.5 Deployment
- [ ] Deploy admin to Vercel (admin.no-mess.xyz)
- [ ] Deploy Convex to production
- [ ] Set up custom domain
- [ ] Configure production environment variables
- [ ] Set up error monitoring (Sentry)

**Blockers:** All features complete

---

## Dependency Graph

```
Phase 0 (Setup)
    │
    ▼
Phase 1 (Core CMS)
    │
    ├──────────────┐
    ▼              ▼
Phase 2 (API)   Phase 3 (Shopify)
    │              │
    └──────┬───────┘
           ▼
    Phase 4 (Polish)
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shopify API rate limits | Medium | Implement backoff, cache aggressively |
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
