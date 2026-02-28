# no-mess — Linear Issues

**Brand:** no-mess
**Domain:** no-mess.xyz

---

## How to Use

Each section = Epic. Items = Issues.
Format: `- [x] [Priority] Title | Labels | Blocked By` (checked = done)

P0 = Critical path, P1 = Important, P2 = Nice to have

---

## Epic: Project Setup — COMPLETE

- [x] [P0] Initialize project with Next.js 16 + Bun | setup
- [x] [P0] Configure Convex backend | setup, convex
- [x] [P0] Create packages/client SDK structure | setup
- [x] [P1] Configure TypeScript strict mode | setup
- [x] [P1] Configure Biome linting + formatting | setup
- [x] [P0] Initialize Convex schema (8 tables) | setup, convex
- [x] [P0] Create Clerk application | setup, auth
- [x] [P0] Install Clerk in admin app | setup, auth
- [x] [P0] Set up Clerk → Convex user sync webhook | setup, auth
- [x] [P0] Install Tailwind v4 + shadcn/ui | setup, admin
- [x] [P0] Create base admin layout with sidebar | setup, admin
- [x] [P1] Set up Convex React provider with Clerk | setup, admin

---

## Epic: Users & Sites — COMPLETE

- [x] [P0] Implement users table schema | convex
- [x] [P0] Create user sync from Clerk webhook | convex, auth
- [x] [P0] Implement sites table schema | convex
- [x] [P0] Generate API key on site creation | convex
- [x] [P0] Generate preview secret on site creation | convex
- [x] [P0] Create site CRUD mutations | convex
- [x] [P0] Build sites list page | admin
- [x] [P0] Build create site dialog | admin
- [x] [P1] Build site settings page | admin
- [x] [P1] Implement site deletion with cascade | convex, admin
- [x] [P1] Implement siteAccess table (editor role) | convex
- [x] [P1] Create invite user mutation | convex
- [x] [P1] Build access check helpers | convex
- [x] [P2] Team members in settings | admin

---

## Epic: Content Types — COMPLETE

- [x] [P0] Implement contentTypes table schema | convex
- [x] [P0] Define field type validators | convex
- [x] [P0] Create contentType CRUD mutations | convex
- [x] [P0] Build content types list page | admin
- [x] [P0] Build content type editor UI | admin
- [x] [P1] Implement field reordering | admin
- [x] [P1] Add field descriptions | admin

---

## Epic: Content Entries — COMPLETE

- [x] [P0] Implement contentEntries table schema | convex
- [x] [P0] Create entry CRUD mutations | convex
- [x] [P0] Implement slug generation from title | convex
- [x] [P0] Build entries list page | admin
- [x] [P0] Build entry editor page | admin

---

## Epic: Dynamic Form — COMPLETE

- [x] [P0] Create DynamicForm component | admin, form
- [x] [P0] Implement text field | admin, form
- [x] [P0] Implement textarea field | admin, form
- [x] [P0] Implement number field | admin, form
- [x] [P0] Implement boolean field | admin, form
- [x] [P1] Implement datetime field | admin, form
- [x] [P1] Implement url field | admin, form
- [x] [P1] Implement select field | admin, form
- [x] [P0] Implement image field with asset picker | admin, form
- [x] [P0] Implement shopifyProduct field with picker | admin, form
- [x] [P1] Add required field validation | admin, form
- [x] [P1] Create FormContext for siteId propagation | admin, form

---

## Epic: Publish Workflow — COMPLETE

- [x] [P0] Add draft/published fields to entries | convex
- [x] [P0] Add status field (draft/published) | convex
- [x] [P0] Create publish mutation | convex
- [x] [P0] Create unpublish mutation | convex
- [x] [P0] Build status badge component | admin
- [x] [P0] Build publish/unpublish buttons | admin

---

## Epic: Assets — COMPLETE

- [x] [P0] Implement assets table schema | convex
- [x] [P0] Configure Convex file storage | convex
- [x] [P0] Create upload mutation (3-step flow) | convex
- [x] [P1] Extract image dimensions | convex
- [x] [P0] Build media library page | admin
- [x] [P0] Build upload dropzone | admin
- [x] [P0] Build asset picker modal | admin
- [x] [P1] Implement asset deletion | convex, admin

---

## Epic: API — COMPLETE

- [x] [P0] Set up Convex HTTP router | convex, api
- [x] [P0] Implement API key validation | convex, api
- [x] [P0] Create GET /api/content/:type endpoint | convex, api
- [x] [P0] Create GET /api/content/:type/:slug endpoint | convex, api
- [x] [P1] Add preview mode with secret | convex, api
- [x] [P1] Add proper error responses | convex, api

---

## Epic: SDK — COMPLETE

- [x] [P0] Set up @no-mess/client package | sdk
- [x] [P0] Implement createNoMessClient | sdk
- [x] [P0] Implement client.getEntry | sdk
- [x] [P0] Implement client.getEntries | sdk
- [x] [P1] Add preview mode support | sdk
- [x] [P0] Write unit tests (8 tests) | sdk

---

## Epic: Preview — COMPLETE

- [x] [P1] Add preview URL to site settings | admin
- [x] [P1] Generate preview links for entries | admin
- [x] [P1] Build Preview button (new tab) | admin

---

## Epic: Shopify Sync — COMPLETE

- [x] [P1] Add Shopify section to site settings | admin, shopify
- [x] [P1] Add store domain field | admin, shopify
- [x] [P1] Add API token field | admin, shopify
- [x] [P1] Add Test Connection button | admin, shopify
- [x] [P1] Create Shopify Admin REST API client | convex, shopify
- [x] [P1] Implement product pagination (250/page) | convex, shopify
- [x] [P1] Handle rate limiting (exponential backoff) | convex, shopify
- [x] [P0] Implement shopifyProducts table | convex, shopify
- [x] [P0] Create sync products action | convex, shopify
- [x] [P1] Build Sync Now button | admin, shopify
- [x] [P1] Show sync status/progress | admin, shopify
- [x] [P2] Implement shopifyCollections table | convex, shopify
- [x] [P2] Create sync collections action | convex, shopify

---

## Epic: Shopify API & Field — COMPLETE

- [x] [P1] Add GET /api/shopify/products endpoint | convex, api, shopify
- [x] [P1] Add GET /api/shopify/products/:handle endpoint | convex, api, shopify
- [x] [P1] Add GET /api/shopify/collections endpoint | convex, api, shopify
- [x] [P1] Add GET /api/shopify/collections/:handle endpoint | convex, api, shopify
- [x] [P1] Add getProducts/getCollections to SDK | sdk, shopify
- [x] [P1] Add shopifyProduct field type | convex, shopify
- [x] [P1] Build product picker component | admin, shopify

---

## Epic: Polish — COMPLETE (code portion)

- [x] [P1] Build site dashboard with stats | admin
- [x] [P1] Add error boundary | admin
- [x] [P1] Add toast notifications (sonner) | admin
- [x] [P1] Add loading states | admin

---

## Epic: Example Site — NOT STARTED

- [ ] [P1] Create Next.js example site | example
- [ ] [P1] Install @no-mess/client | example
- [ ] [P1] Fetch and display content | example
- [ ] [P1] Document preview setup | example, docs

---

## Epic: Documentation — NOT STARTED

- [ ] [P1] Write getting started guide | docs
- [ ] [P1] Document field types | docs
- [ ] [P1] Document SDK usage | docs
- [ ] [P1] Document Shopify Custom App setup | docs
- [ ] [P2] Add inline help in admin | admin, docs

---

## Epic: Deployment — NOT STARTED

- [ ] [P0] Deploy admin to Vercel | deploy
- [ ] [P0] Deploy Convex to production | deploy
- [ ] [P1] Configure admin.no-mess.xyz | deploy
- [ ] [P1] Set up production env vars | deploy
- [ ] [P2] Set up Sentry error monitoring | deploy

---

## Labels

| Label | Description |
|-------|-------------|
| setup | Project setup |
| convex | Backend work |
| admin | Dashboard UI |
| sdk | Client SDK |
| api | HTTP API |
| form | Form components |
| shopify | Shopify integration |
| auth | Authentication |
| docs | Documentation |
| deploy | Deployment |
| example | Example site |

---

## Milestones

### M1: MVP — COMPLETE
All P0 items in: Setup, Users & Sites, Content Types, Entries, Form, Publish, Assets, API, SDK

**Result:** Dev can create site, define schemas, add content, fetch via SDK

### M2: Shopify — COMPLETE
All items in: Shopify Sync, Shopify API & Field

**Result:** Products sync from Shopify, usable in content

### M3: Launch — IN PROGRESS
All items in: Polish (code complete), Example (not started), Docs (not started), Deployment (not started)

**Result:** Production-ready, documented, deployed
