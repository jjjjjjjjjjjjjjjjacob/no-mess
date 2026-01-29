# no-mess — Linear Issues

**Brand:** no-mess  
**Domain:** no-mess.xyz  

---

## How to Use

Each section = Epic. Items = Issues.  
Format: `- [ ] [Priority] Title | Labels | Blocked By`

P0 = Critical path, P1 = Important, P2 = Nice to have

---

## Epic: Project Setup

- [ ] [P0] Initialize monorepo with pnpm + Turborepo | setup
- [ ] [P0] Create apps/admin Next.js app | setup
- [ ] [P0] Create packages/convex | setup
- [ ] [P0] Create packages/client SDK | setup
- [ ] [P1] Configure shared TypeScript config | setup
- [ ] [P1] Configure ESLint + Prettier | setup
- [ ] [P0] Initialize Convex project | setup, convex
- [ ] [P0] Create Clerk application | setup, auth
- [ ] [P0] Install Clerk in admin app | setup, auth
- [ ] [P0] Set up Clerk → Convex user sync webhook | setup, auth
- [ ] [P0] Install Tailwind + shadcn/ui | setup, admin
- [ ] [P0] Create base admin layout | setup, admin
- [ ] [P1] Set up Convex React provider | setup, admin

---

## Epic: Users & Sites

- [ ] [P0] Implement users table schema | convex
- [ ] [P0] Create user sync from Clerk webhook | convex, auth
- [ ] [P0] Implement sites table schema | convex
- [ ] [P0] Generate API key on site creation | convex
- [ ] [P0] Generate preview secret on site creation | convex
- [ ] [P0] Create site CRUD mutations | convex
- [ ] [P0] Build sites list page | admin
- [ ] [P0] Build create site page | admin
- [ ] [P1] Build site settings page | admin
- [ ] [P1] Implement site deletion | convex, admin
- [ ] [P1] Implement siteAccess table (owner/editor) | convex
- [ ] [P1] Create invite user mutation | convex
- [ ] [P1] Build invite user modal | admin
- [ ] [P2] Build team members list | admin

---

## Epic: Content Types

- [ ] [P0] Implement contentTypes table schema | convex
- [ ] [P0] Define field type validators | convex
- [ ] [P0] Create contentType CRUD mutations | convex
- [ ] [P0] Build content types list page | admin
- [ ] [P0] Build content type editor UI | admin
- [ ] [P1] Implement field reordering | admin
- [ ] [P1] Add field descriptions | admin

---

## Epic: Content Entries

- [ ] [P0] Implement contentEntries table schema | convex
- [ ] [P0] Create entry CRUD mutations | convex
- [ ] [P0] Implement slug generation | convex
- [ ] [P0] Build entries list page | admin
- [ ] [P0] Build entry editor page | admin
- [ ] [P1] Implement auto-save | admin

---

## Epic: Dynamic Form

- [ ] [P0] Create DynamicForm component | admin, form
- [ ] [P0] Implement text field | admin, form
- [ ] [P0] Implement textarea field | admin, form
- [ ] [P0] Implement number field | admin, form
- [ ] [P0] Implement boolean field | admin, form
- [ ] [P1] Implement datetime field | admin, form
- [ ] [P1] Implement url field | admin, form
- [ ] [P1] Implement select field | admin, form
- [ ] [P0] Implement image field with picker | admin, form
- [ ] [P1] Add required field validation | admin, form

---

## Epic: Publish Workflow

- [ ] [P0] Add draft/published fields to entries | convex
- [ ] [P0] Add status field (draft/published) | convex
- [ ] [P0] Create publish mutation | convex
- [ ] [P0] Create unpublish mutation | convex
- [ ] [P0] Build status badge component | admin
- [ ] [P0] Build publish/unpublish buttons | admin

---

## Epic: Assets

- [ ] [P0] Implement assets table schema | convex
- [ ] [P0] Configure Convex file storage | convex
- [ ] [P0] Create upload mutation | convex
- [ ] [P1] Extract image dimensions | convex
- [ ] [P0] Build media library page | admin
- [ ] [P0] Build upload dropzone | admin
- [ ] [P0] Build asset picker modal | admin
- [ ] [P1] Implement asset deletion | convex, admin

---

## Epic: API

- [ ] [P0] Set up Convex HTTP router | convex, api
- [ ] [P0] Implement API key validation | convex, api
- [ ] [P0] Create GET /api/content/:type endpoint | convex, api
- [ ] [P0] Create GET /api/content/:type/:slug endpoint | convex, api
- [ ] [P1] Add preview mode with secret | convex, api
- [ ] [P1] Add cache headers | convex, api

---

## Epic: SDK

- [ ] [P0] Set up @no-mess/client package | sdk
- [ ] [P0] Implement createNoMessClient | sdk
- [ ] [P0] Implement client.getEntry | sdk
- [ ] [P0] Implement client.getEntries | sdk
- [ ] [P1] Add preview mode support | sdk
- [ ] [P1] Write README with examples | sdk, docs
- [ ] [P1] Publish to npm | sdk

---

## Epic: Preview

- [ ] [P1] Add preview URL to site settings | admin
- [ ] [P1] Generate preview links for entries | admin
- [ ] [P1] Build Preview button (new tab) | admin
- [ ] [P1] Document preview mode setup | docs

---

## Epic: Shopify Sync

- [ ] [P1] Add Shopify section to site settings | admin, shopify
- [ ] [P1] Add store domain field | admin, shopify
- [ ] [P1] Add API token field | admin, shopify
- [ ] [P1] Create Shopify API client | convex, shopify
- [ ] [P1] Implement product pagination | convex, shopify
- [ ] [P1] Handle rate limiting | convex, shopify
- [ ] [P0] Implement shopifyProducts table | convex, shopify
- [ ] [P0] Create sync products mutation | convex, shopify
- [ ] [P1] Build Sync Now button | admin, shopify
- [ ] [P1] Show sync status/progress | admin, shopify
- [ ] [P2] Implement shopifyCollections table | convex, shopify
- [ ] [P2] Create sync collections mutation | convex, shopify

---

## Epic: Shopify API & Field

- [ ] [P1] Add GET /api/shopify/products endpoint | convex, api, shopify
- [ ] [P1] Add GET /api/shopify/products/:handle endpoint | convex, api, shopify
- [ ] [P1] Add getProducts to SDK | sdk, shopify
- [ ] [P1] Add shopifyProduct field type | convex, shopify
- [ ] [P1] Build product picker component | admin, shopify

---

## Epic: Polish

- [ ] [P1] Build site dashboard | admin
- [ ] [P1] Add error boundaries | admin
- [ ] [P1] Add toast notifications | admin
- [ ] [P1] Add loading states | admin
- [ ] [P2] Improve form validation UX | admin

---

## Epic: Example Site

- [ ] [P1] Create Next.js example site | example
- [ ] [P1] Install @no-mess/client | example
- [ ] [P1] Fetch and display content | example
- [ ] [P1] Document preview setup | example, docs

---

## Epic: Documentation

- [ ] [P1] Write getting started guide | docs
- [ ] [P1] Document field types | docs
- [ ] [P1] Document SDK usage | docs
- [ ] [P1] Document Shopify Custom App setup | docs
- [ ] [P2] Add inline help in admin | admin, docs

---

## Epic: Deployment

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

### M1: MVP
All P0 items in: Setup, Users & Sites, Content Types, Entries, Form, Publish, Assets, API, SDK

**Result:** Dev can create site, define schemas, add content, fetch via SDK

### M2: Shopify
All items in: Shopify Sync, Shopify API & Field

**Result:** Products sync from Shopify, usable in content

### M3: Launch
All items in: Polish, Example, Docs, Deployment

**Result:** Production-ready, documented, deployed

