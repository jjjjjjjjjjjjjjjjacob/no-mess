---
"@no-mess/client": minor
---

Expand the SDK for deployed runtime delivery and route-aware Live Edit.

- add `fetch` and `fresh` options for content reads, with automatic `fresh=true`
  for runtime `cache: "no-store"` and `next.revalidate = 0` requests
- allow `@no-mess/client/next` helpers to accept API URL, fetch, logger, and
  fresh-mode overrides
- keep the published SDK declarations aligned with the `index.ts` public exports
  and ensure `buildSrcSet` always includes the base image URL as a fallback
- document deployed runtime delivery, uncached preview/fresh reads, and the
  route-aware Live Edit integration requirements
