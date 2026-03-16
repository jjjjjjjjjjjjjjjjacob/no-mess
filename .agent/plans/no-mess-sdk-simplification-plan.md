# no-mess SDK Simplification Plan

## Objective

Move the common CMS adapter code that consumer apps currently rebuild on top of
`@no-mess/client` into first-class SDK and CLI primitives.

The representative downstream target is `mershy`, which currently carries:

- `lib/cms/client.ts`
- `lib/cms/index.ts`
- `lib/cms/types.ts`
- `lib/cms/selectors.ts`

Success means a consumer app can delete most of that surface and replace it
with supported imports from `no-mess`.

## Current Repository Audit

This plan needs to start from the code that exists today, not from the earlier
proposal assumptions.

### What already exists

- `@no-mess/client/schema` already ships the schema DSL, parser, serializer,
  and tree utilities.
- `@no-mess/client` already ships:
  - `createNoMessClient()`
  - content fetchers: `getEntries()` and `getEntry()`
  - Shopify catalog fetchers: `getProducts()`, `getProduct()`,
    `getCollections()`, `getCollection()`
  - preview and route-aware Live Edit primitives
- published content delivery is already enforced server-side:
  - `convex/contentTypes.ts:listBySiteInternal`
  - `convex/contentTypes.ts:getBySlugInternal`
  - both hide draft-only schemas from delivery APIs

### Important mismatches in the current repo

1. Publish semantics are under-documented in product docs and CLI output.
   - `packages/no-mess-cli/src/commands/push.ts` only syncs schemas to
     `/api/schema/sync` and then prints `Push complete.`
   - delivery APIs only serve published schemas and published entries
   - the result is a real "push succeeded but `/api/content/:type` still 404s"
     trap

2. Several docs currently describe behavior that is not implemented.
   - `app/(docs)/docs/cli/page.tsx` says `push` shows a diff preview and prompts
     for confirmation; it does neither
   - the same page says `init` creates `no-mess.schema.ts`; the CLI defaults to
     `schema.ts`
   - `app/(docs)/docs/getting-started/page.tsx` and
     `app/(docs)/docs/shopify/page.tsx` use `NO_MESS_SECRET_KEY` in examples,
     while the actual documented env var is `NO_MESS_API_KEY`

3. Shopify schema introspection does not match runtime delivery.
   - `convex/lib/schemaIntrospection.ts` emits object-like Shopify shapes
   - the Shopify field docs say the content field stores a handle string
   - consumers currently have to write normalization code because the generated
     contract is wrong

4. The client is still missing the high-level fetch helpers downstream apps
   actually need.
   - no singleton helper
   - no null-safe `getEntryOrNull()`
   - no Next.js env wrapper subpath

5. There is no supported path from schema definitions to app-usable types.
   - schema introspection is read-only and currently shallow
   - there is no `no-mess codegen`

## Decisions

These decisions make the plan executable and avoid re-litigating scope during
implementation.

### 1. Do not ship `push --publish` in the first pass

The immediate problem is ambiguity, not missing automation. The first fix is:

- correct the docs
- correct CLI output
- make draft-vs-published schema state impossible to miss after `push`

`push --publish` can be evaluated later, but it should not block the baseline
ergonomics work.

### 2. Treat Shopify references as explicit ref contracts

The first-class client contract should be:

- `ShopifyProductRef = string | { handle: string }`
- `ShopifyCollectionRef = string | { handle: string }`

This matches current raw storage while staying forward-compatible with expanded
payloads.

### 3. Ship code generation from the local schema file, not from `/api/schema`

The CLI already parses the local schema source via `parseSchemaSource()`. That
should be the source of truth for app codegen because it:

- avoids depending on published dashboard state
- works before a schema is pushed or published
- avoids inheriting current schema introspection limitations

The schema introspection API should still be corrected, but it is not the right
foundation for downstream app codegen.

### 4. Defer route-based singleton lookup

`getSingletonByRoute()` sounds attractive, but there is no clean published route
lookup API today. It adds backend and API surface area without unblocking the
main consumer pain. Keep it out of the first delivery sequence.

## Target Consumer Experience

### Near-term

```ts
import { createServerNoMessClient } from "@no-mess/client/next";
import { getShopifyHandle } from "@no-mess/client";

const cms = createServerNoMessClient();
const homePage = await cms.getSingleton("home-page");

const featuredHandles =
  homePage?.featuredProducts
    ?.map((item) => getShopifyHandle(item.product))
    .filter(Boolean) ?? [];
```

### Later

```ts
import { createServerNoMessClient } from "@no-mess/client/next";
import type { HomePageEntry } from "./no-mess.generated";

const cms = createServerNoMessClient();
const homePage = await cms.getSingleton<HomePageEntry>("home-page", {
  expand: ["shopify"],
});
```

## Workstreams

### Workstream A: Correct publish semantics and doc drift

Status: not started

#### Scope

- fix README and docs wording so it matches the product that exists
- update CLI output after schema sync
- explicitly explain the schema publish step

#### Implementation

1. Update `packages/no-mess-cli/README.md` to state:
   - `push` syncs schema changes as drafts
   - published delivery APIs only see published schemas
   - a schema must be published in the dashboard before `/api/content/:type`
     can serve it
2. Update docs pages:
   - `app/(docs)/docs/cli/page.tsx`
   - `app/(docs)/docs/getting-started/page.tsx`
   - `app/(docs)/docs/sdk/page.tsx`
   - `app/(docs)/docs/shopify/page.tsx`
3. Fix doc inaccuracies unrelated to the publish warning while touching those
   pages:
   - `schema.ts` versus `no-mess.schema.ts`
   - `NO_MESS_API_KEY` versus `NO_MESS_SECRET_KEY`
   - remove claims about diff previews and confirmation prompts unless those
     features are actually built
4. Update `packages/no-mess-cli/src/commands/push.ts` and
   `packages/no-mess-cli/src/commands/dev.ts` so successful sync output ends
   with a clear draft-state warning.
5. Defer `push --publish` to a later decision. Do not add it to the first PR.

#### Acceptance criteria

- a successful `push` no longer implies that schemas are immediately queryable
  from `/api/content`
- CLI output and docs use the same draft-versus-published wording
- docs no longer promise diff previews, prompts, or filenames/env vars that the
  code does not support

#### Tests

- add CLI tests covering the post-sync warning
- smoke-check touched docs snippets for env var names and filenames

### Workstream B: Normalize Shopify reference contracts

Status: not started

#### Scope

- add explicit ref types to the client package
- add normalization helpers
- fix schema introspection output
- document raw refs versus synced Shopify records

#### Implementation

1. Add exported types to `packages/no-mess-client/src/types.ts`:
   - `ShopifyProductRef`
   - `ShopifyCollectionRef`
2. Add `packages/no-mess-client/src/reference-utils.ts` with:
   - `getShopifyHandle(ref)`
   - `isShopifyProductRef(ref)`
   - `isShopifyCollectionRef(ref)`
3. Export those types and helpers from `packages/no-mess-client/src/index.ts`.
4. Update `convex/lib/schemaIntrospection.ts` so Shopify fields emit the ref
   contract instead of the current expanded object shape.
5. Update `convex/__tests__/schemaIntrospection.test.ts` to lock the new output.
6. Update `app/(docs)/docs/shopify/page.tsx` and `app/(docs)/docs/sdk/page.tsx`
   to distinguish between:
   - a Shopify reference stored inside CMS content
   - synced Shopify product/collection records fetched from `/api/shopify/*`

#### Acceptance criteria

- schema introspection output matches raw delivery payloads
- consumers do not need to guess whether a Shopify field is a string or an
  object
- the SDK provides one supported way to extract a handle from either shape

#### Notes

Schema introspection is still shallow overall. This workstream only fixes the
Shopify contract drift. Full recursive contract generation is handled by
Workstream E.

### Workstream C: Add higher-level content fetch APIs

Status: not started

#### Scope

- singleton helpers
- null-safe entry fetch
- consistent 404 handling

#### Implementation

1. Extend `packages/no-mess-client/src/client.ts` with:
   - `getSingleton<T>(contentType: string, options?)`
   - `getRequiredSingleton<T>(contentType: string, options?)`
   - `getEntryOrNull<T>(contentType: string, slug: string, options?)`
2. Reuse the existing content endpoints in the first pass:
   - `getEntryOrNull()` wraps `getEntry()` and returns `null` on 404
   - `getSingleton()` reads the content type list endpoint, returns the first
     entry, and warns if more than one published entry exists
3. Keep non-404 errors intact so request metadata and retryability are not lost.
4. Do not add `getSingletonByRoute()` in this phase.

#### Acceptance criteria

- downstream apps can delete custom `fetchSingleton()` wrappers
- downstream apps can delete custom try/catch wrappers for expected 404s
- the common homepage singleton case becomes one supported SDK call

#### Tests

- add `getEntryOrNull()` coverage to
  `packages/no-mess-client/src/__tests__/client.test.ts`
- add singleton tests for:
  - zero entries
  - one entry
  - multiple entries with warning
  - missing content type returning `null`

### Workstream D: Add Next.js environment helpers

Status: not started

#### Scope

- server helper
- browser helper
- clear env validation and defaults

#### Implementation

1. Add a new subpath export: `@no-mess/client/next`.
2. Add `packages/no-mess-client/src/next/index.ts` that exports:
   - `createServerNoMessClient()`
   - `createBrowserNoMessClient()`
3. Use the following env lookup order:
   - server helper:
     - `NO_MESS_API_KEY`
     - `NO_MESS_API_URL`
     - fallback `NEXT_PUBLIC_NO_MESS_API_URL`
     - fallback `DEFAULT_API_URL`
   - browser helper:
     - `NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY`
     - `NEXT_PUBLIC_NO_MESS_API_URL`
     - fallback `DEFAULT_API_URL`
4. Throw explicit config errors when required env vars are missing.
5. Update `packages/no-mess-client/package.json` exports and README examples.

#### Acceptance criteria

- consumer apps can delete local Next.js client factory wrappers
- server code stops repeating `process.env.NO_MESS_API_KEY!`
- browser code stops repeating publishable-key bootstrapping

#### Tests

- add unit tests for both env helpers
- cover missing-env failures and fallback order

### Workstream E: Ship schema-derived types and metadata

Status: not started

#### Scope

- `no-mess codegen`
- recursive entry and fragment types
- field-path metadata for Live Edit annotations
- slug and route constants

#### Implementation

1. Add a CLI command:
   - `no-mess codegen`
   - `no-mess codegen --schema schema.ts`
   - `no-mess codegen --out no-mess.generated.ts`
2. Generate from the local schema file by reusing
   `@no-mess/client/schema` parsing rather than calling `/api/schema`.
3. Output should include:
   - one entry interface per template
   - one value interface per fragment
   - imports for `NoMessEntry`, `ShopifyProductRef`, and
     `ShopifyCollectionRef`
   - template slug constants
   - route constants for templates that declare a route
   - field-path metadata
4. Keep field-path output simple in v1:
   - generate a flat `const` map of path strings
   - generate a companion union type from that map
5. Prefer one shared recursive contract renderer for codegen and schema
   introspection. If Convex import constraints make that awkward, keep the core
   renderer shared and let the Convex layer adapt it.

#### Acceptance criteria

- downstream apps can delete hand-written CMS entry interfaces
- Live Edit field names can be imported instead of hard-coded strings
- generated output matches the actual delivery contract, including Shopify refs

#### Tests

- add codegen snapshot tests for:
  - singleton templates
  - collection templates
  - fragments
  - object fields
  - array fields
  - Shopify refs

### Workstream F: Optional Shopify reference expansion

Status: not started

#### Scope

- opt-in `expand` support
- client option plumbing
- backend Shopify ref resolution

#### Implementation

1. Extend content fetch options with `expand`.
   - query string form: `expand=shopify`
   - client option form: `{ expand: ["shopify"] }`
2. Add backend resolution in `convex/contentEntries.ts` so Shopify handles can
   resolve to synced product and collection records when expansion is requested.
3. Keep raw handle delivery as the default behavior.
4. Document the tradeoff:
   - expanded refs return synced Shopify data from no-mess
   - expanded refs are not a replacement for a full Storefront GraphQL model
5. If list expansion creates unacceptable payload size or latency, ship single-
   entry expansion first and leave list expansion as a follow-up.

#### Acceptance criteria

- consumers can opt into expanded Shopify refs without custom selectors
- raw handle mode remains available and documented

#### Tests

- backend tests for raw versus expanded responses
- client tests ensuring `expand` is serialized correctly

## Delivery Order

### Phase 1: Correct docs and contracts

- Workstream A
- Workstream B

Outcome:

- publish behavior is no longer ambiguous
- Shopify reference shapes stop drifting between docs, introspection, and
  runtime

### Phase 2: Core SDK ergonomics

- Workstream C
- Workstream D

Outcome:

- downstream `client.ts` and singleton wrapper code becomes unnecessary

### Phase 3: Code generation

- Workstream E

Outcome:

- downstream `types.ts` and hard-coded field-path strings mostly disappear

### Phase 4: Opt-in Shopify expansion

- Workstream F

Outcome:

- apps satisfied with synced Shopify data can remove most custom ref resolution

## PR Breakdown

Keep this work in small, reviewable PRs.

1. Docs + CLI warning
   - Workstream A only
2. Shopify ref types + helpers + introspection fix
   - Workstream B only
3. Singleton + null-safe fetch helpers
   - Workstream C only
4. Next.js env subpath
   - Workstream D only
5. `no-mess codegen`
   - Workstream E only
6. Optional `expand=shopify`
   - Workstream F only

## Concrete File Targets

### Existing files likely to change

- `packages/no-mess-client/src/client.ts`
- `packages/no-mess-client/src/types.ts`
- `packages/no-mess-client/src/index.ts`
- `packages/no-mess-client/package.json`
- `packages/no-mess-client/README.md`
- `packages/no-mess-cli/src/commands/push.ts`
- `packages/no-mess-cli/src/commands/dev.ts`
- `packages/no-mess-cli/src/cli.ts`
- `packages/no-mess-cli/README.md`
- `convex/lib/schemaIntrospection.ts`
- `convex/contentEntries.ts`
- `app/(docs)/docs/cli/page.tsx`
- `app/(docs)/docs/getting-started/page.tsx`
- `app/(docs)/docs/sdk/page.tsx`
- `app/(docs)/docs/shopify/page.tsx`

### New files likely to be added

- `packages/no-mess-client/src/reference-utils.ts`
- `packages/no-mess-client/src/next/index.ts`
- `packages/no-mess-client/src/__tests__/next.test.ts`
- `packages/no-mess-cli/src/commands/codegen.ts`
- `packages/no-mess-cli/src/codegen/*`
- `packages/no-mess-cli/src/__tests__/push.test.ts`
- `packages/no-mess-cli/src/__tests__/codegen.test.ts`

## Success Criteria

This work is successful when a representative consumer app can:

- delete its local CMS client factory
- delete its local singleton fetch wrapper
- delete its hand-written CMS entry interfaces
- stop normalizing Shopify references by hand
- follow one documented happy path without guessing at hidden publish steps

In practical terms, after Phases 1 through 3, `mershy` should be able to remove
most or all of:

- `lib/cms/client.ts`
- `lib/cms/index.ts`
- `lib/cms/types.ts`
- much of `lib/cms/selectors.ts`
