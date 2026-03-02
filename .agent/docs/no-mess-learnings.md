# no-mess — Learnings

Contextually relevant advice from building the no-mess CMS. Reference when working on future tasks in this workspace.

---

## Convex

### Filenames must be camelCase
- **When:** Creating any new Convex function file in `/convex/`
- **Rule:** Convex filenames cannot contain hyphens. Use camelCase (e.g., `contentTypes.ts`, `siteAccess.ts`, `contentEntries.ts`)
- **Why:** Convex code generation breaks with hyphenated filenames

### Run codegen after schema/function changes
- **When:** After creating or modifying any file in `/convex/` (schema, queries, mutations, actions)
- **Command:** `bunx convex codegen`
- **Why:** TypeScript types in `/convex/_generated/` won't reflect new tables, functions, or args until codegen runs. This causes `api.moduleName` type errors.

### Convex 3-step file upload pattern
- **When:** Implementing file uploads with Convex storage
- **Pattern:**
  1. Call `generateUploadUrl` mutation to get a signed upload URL
  2. `POST` the file directly to that URL (returns `storageId`)
  3. Call `create` mutation with `storageId` + metadata (filename, mimeType, size, etc.)
- **Note:** The `url` field is NOT passed from client — it's derived server-side from the `storageId`

### Internal queries for HTTP API routes
- **When:** HTTP routes need to query data without user auth context
- **Pattern:** Use `internalQuery` / `internalMutation` for HTTP API handlers. Regular `query`/`mutation` requires Clerk auth context which HTTP API callers don't have.

---

## Biome / Linting

### Non-null assertions forbidden
- **When:** TypeScript narrowing doesn't satisfy Biome
- **Rule:** `!` (non-null assertion) is forbidden by Biome's recommended rules
- **Fix:** Extract to a local variable with an `if` guard, or use `as` cast
- **Example:**
  ```typescript
  // BAD: args.slug!
  // GOOD:
  if (args.slug !== undefined) {
    const slugToCheck = args.slug;
    // use slugToCheck...
  }
  ```

### shadcn/ui components generate lint warnings
- **When:** Adding new shadcn/ui components via CLI
- **Context:** Pre-existing shadcn components trigger accessibility and suspicious-code warnings
- **Approach:** Configure rules as `"warn"` in biome.json rather than `"off"` — keeps them visible but non-blocking
- **Rules commonly needing warn level:**
  - `useSemanticElements`, `noLabelWithoutControl`, `useKeyWithClickEvents`
  - `noRedundantAlt`, `useFocusableInteractive`, `noStaticElementInteractions`
  - `noDocumentCookie`, `noArrayIndexKey`, `noImgElement`, `noDoubleEquals`

### Import ordering auto-fix
- **When:** After subagents create files or after edits
- **Command:** `bunx biome check --write --unsafe`
- **Why:** Biome's `organizeImports` assist is enabled. Subagents often produce non-canonical import order. The `--unsafe` flag is needed for import reordering.

### Exclude SDK from root Biome
- **When:** Adding packages outside the main app
- **Rule:** Add `!packages` to biome.json `files.includes` array
- **Why:** SDK `dist/` output files get picked up by root Biome and fail format checks

---

## Next.js / React

### shadcn sidebar requires use-mobile hook
- **When:** Adding the shadcn sidebar component
- **Dependency chain:** sidebar.tsx → sheet.tsx → `useIsMobile` from `@/hooks/use-mobile`
- **Fix:** Create `/hooks/use-mobile.ts` with `matchMedia`-based mobile detection (breakpoint: 768px)

### FieldType cast for select elements
- **When:** Rendering `<select>` elements where the value is a union type
- **Issue:** `e.target.value` is always `string`, not the narrower union type
- **Fix:** Cast with `as FieldType` (safe because `<option>` values are the valid enum members)

### FormContext for nested field components
- **When:** Dynamic form field components need access to parent data (e.g., siteId)
- **Pattern:** Create a React context (`FormContext`) in the dynamic-form directory, wrap `DynamicForm` in a provider, consume in leaf field components (e.g., `image-field.tsx` needs siteId for asset queries)

---

## Architecture Patterns

### Site slug from URL params
- **Pattern:** `use-site.ts` hook reads `siteSlug` from `useParams()`, queries Convex `sites.getBySlug`
- **Returns:** `{ site, isLoading }` — used across all `[siteSlug]` route pages

### Cascade delete for sites
- **When:** Deleting a site
- **Pattern:** Delete all child records (contentTypes, contentEntries, assets + storage, siteAccess, shopifyProducts, shopifyCollections) before deleting the site itself
- **Note:** Convex doesn't have cascade delete — must be done manually in the mutation

### API key format
- **Format:** `nm_` prefix + 32 hex characters (via `crypto.randomBytes(32).toString("hex")`)
- **Validation:** HTTP API extracts from `Authorization: Bearer nm_...` header

### Preview mode (v2 — iframe + HMAC)
- **When:** Working on the preview system or debugging preview issues
- **Flow:** Entry editor has Preview toggle → opens iframe panel → `PreviewPanel` component creates a preview session via `previewSessions.create` mutation → iframe loads `{previewUrl}/no-mess-preview?sid={sessionId}` → postMessage handshake exchanges sessionSecret → iframe SDK computes HMAC-SHA256 proof → POST `/api/preview/exchange` returns draft content
- **Key files:**
  - `components/content-entries/preview-panel.tsx` — admin dashboard iframe component (state machine: idle → creating_session → waiting_for_iframe → handshake_sent → active)
  - `convex/previewSessions.ts` — session CRUD (create, getValidSession, markSessionUsed)
  - `convex/lib/previewCrypto.ts` — HMAC-SHA256 compute/verify via Web Crypto API
  - `convex/http.ts` — POST `/api/preview/exchange` endpoint
  - `packages/no-mess-client/src/index.ts` — `createPreviewHandler()` helper for client sites
  - `packages/no-mess-client/src/client.ts` — `exchangePreviewSession()` method
- **Security:** Session IDs are opaque (useless without secret), secrets travel only via postMessage (never in URLs), 10-minute TTL, HMAC proof has 60-second freshness window
- **postMessage protocol:**
  - Parent→Iframe: `no-mess:session-auth` (sessionId + sessionSecret), `no-mess:refresh`
  - Iframe→Parent: `no-mess:preview-ready`, `no-mess:preview-loaded`, `no-mess:preview-error`
- **CSP requirement:** Client sites must set `Content-Security-Policy: frame-ancestors 'self' https://admin.no-mess.xyz` on their `/no-mess-preview` route
- **Legacy:** The old `?preview=true&secret=...` URL-based system still works via `getEntry()` with `preview: true` option but is deprecated

### SDK default API URL
- **When:** Initializing the SDK client
- **Pattern:** `apiUrl` is optional, defaults to `https://api.no-mess.xyz` (the hosted API gateway)
- **Override:** Pass custom `apiUrl` for self-hosted or dev setups: `createNoMessClient({ apiUrl: "https://...", apiKey: "nm_..." })`
- **Constant:** `DEFAULT_API_URL` exported from `@no-mess/client`

### API Gateway (Cloudflare Worker)
- **When:** Working on the API gateway or debugging API routing
- **Location:** `packages/api-gateway/`
- **Pipeline:** CORS preflight → extract API key → rate limit (KV sliding window, 120 req/min) → cache check (GET only) → proxy to Convex upstream → cache store → async logging → CORS headers
- **Key files:**
  - `src/index.ts` — Worker fetch handler entry point
  - `src/proxy.ts` — upstream proxying, strips `server` and `x-convex-request-id` headers
  - `src/cors.ts` — CORS preflight (204) and response header injection
  - `src/rateLimit.ts` — KV-based sliding window + `extractApiKey()` helper
  - `src/cache.ts` — cache key builder (includes API key for per-site isolation)
  - `src/logger.ts` — JSON request logging via console.log
  - `src/config.ts` — `Env` interface, `GATEWAY_VERSION`
- **Deployment:** `wrangler deploy` (wrangler.toml has placeholder upstream URL)
- **tsconfig exclusion:** `packages/api-gateway` MUST be in root `tsconfig.json` `exclude` array — otherwise Next.js build picks up `KVNamespace` type and fails

---

## Subagent Usage

### Parallel subagents for independent work
- **When:** Multiple files/features can be built independently
- **Pattern:** Launch 2-3 subagents in parallel for non-overlapping work (e.g., backend + UI + form components)
- **Caveat:** Each subagent may produce import ordering issues — run `bunx biome check --write --unsafe` after merging

### Always verify after subagent work
- **Command sequence:**
  ```bash
  bunx biome check --write --unsafe  # Fix imports
  bunx convex codegen                 # Regenerate types if convex files changed
  bunx tsc --noEmit                   # Type check
  bun run lint                        # Lint check
  bun run build                       # Build check
  ```

---

## Testing

### Vitest across three packages
- **Root (Convex):** `vitest.config.ts` with jsdom + globals enabled. Tests in `convex/__tests__/`. Covers: utils, previewCrypto (HMAC compute/verify, session generators)
- **SDK (`packages/no-mess-client`):** `vitest.config.ts` minimal. Tests in `src/__tests__/`. Covers: client methods (getEntries, getEntry, getProducts, etc.), exchangePreviewSession, createPreviewHandler
- **API Gateway (`packages/api-gateway`):** `vitest.config.ts` with `globals: false`. Tests in `src/__tests__/`. Covers: extractApiKey, buildCacheKey, proxy, CORS, logger, pipeline integration
- **Run all:** `bun run test` (root), `cd packages/no-mess-client && bun run test` (SDK), `cd packages/api-gateway && bun run test` (gateway)

### Gateway tests must import from "vitest"
- **When:** Writing tests in `packages/api-gateway/`
- **Rule:** `globals: false` in the gateway vitest config means you must `import { describe, it, expect, vi, beforeEach } from "vitest"` explicitly
- **Why:** The gateway package runs in Cloudflare Workers runtime (not jsdom), so no globals

### Mock patterns
- **SDK tests:** Mock `globalThis.fetch` with `vi.fn()` to control HTTP responses
- **Gateway proxy tests:** Mock `globalThis.fetch` for upstream responses
- **Gateway integration tests:** Mock `caches.default` (match/put), `ExecutionContext.waitUntil`, and optionally KV for rate limiting
- **Preview handler tests:** Mock `window.addEventListener`, `window.removeEventListener`, `window.parent.postMessage`; capture the handler from addEventListener and invoke it directly with mock MessageEvents
