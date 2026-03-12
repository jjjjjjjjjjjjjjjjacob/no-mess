# no-mess

A multi-tenant headless CMS built on [Convex](https://convex.dev) and [Next.js](https://nextjs.org).

## Monorepo Structure

```
no-mess/
├── app/                    # Next.js admin dashboard (App Router)
├── components/             # React components (shadcn/ui in components/ui/)
├── convex/                 # Convex backend (schema, queries, mutations, actions)
├── hooks/                  # React hooks
├── lib/                    # Shared utilities
├── packages/
│   ├── api-gateway/        # Cloudflare Workers edge API gateway (private)
│   ├── no-mess-cli/        # CLI tool (`no-mess`)
│   ├── no-mess-client/     # TypeScript SDK (`@no-mess/client`)
│   └── no-mess-mcp/        # MCP server for AI coding agents (`@no-mess/mcp`)
└── .github/workflows/      # CI, release, auto-approve
```

## Packages

| Directory | npm name | Description | Version |
|-----------|----------|-------------|---------|
| `packages/no-mess-client` | [`@no-mess/client`](packages/no-mess-client) | TypeScript SDK for fetching content, schemas, and Shopify data | 0.1.1 |
| `packages/no-mess-mcp` | [`@no-mess/mcp`](packages/no-mess-mcp) | MCP server exposing CMS tools to AI coding agents | 1.0.0 |
| `packages/no-mess-cli` | [`no-mess`](packages/no-mess-cli) | CLI for managing schemas (`init`, `push`, `pull`, `dev`) | 0.1.0 |
| `packages/api-gateway` | `@no-mess/api-gateway` | Edge API gateway on Cloudflare Workers (private) | 0.1.0 |

## Docs

- [Getting Started](app/(docs)/docs/getting-started/page.tsx) for the core CMS flow
- [Field Types](app/(docs)/docs/field-types/page.tsx) for primitive and recursive schema fields
- [CLI & Schema as Code](app/(docs)/docs/cli/page.tsx) for `defineTemplate()`, `defineFragment()`, and schema sync
- [Preview Mode](app/(docs)/docs/preview/page.tsx) for route-aware preview and the legacy fallback route
- [Live Edit](app/(docs)/docs/live-edit/page.tsx) for URL-aware live editing on real site routes
- [Local Development](app/(docs)/docs/local-dev/page.tsx) for localhost preview and Live Edit setup
- [SDK Usage](app/(docs)/docs/sdk/page.tsx) for `@no-mess/client` examples
- [API Reference](app/(docs)/docs/api/page.tsx) for content, preview, and route-reporting endpoints

## Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- [Node.js](https://nodejs.org) 20+
- [Convex CLI](https://docs.convex.dev/getting-started) (`bun add -g convex`)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/no-mess.git
cd no-mess

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, etc.

# Start the Convex dev server (in a separate terminal)
bunx convex dev

# Start the Next.js admin dashboard
bun dev
```

The admin dashboard runs at [http://localhost:4567](http://localhost:4567).

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start Next.js dev server on port 4567 |
| `bun run build` | Production build |
| `bun start` | Start production server |
| `bun run lint` | Lint with Biome |
| `bun run format` | Format with Biome |
| `bun run test` | Run tests (Vitest) |
| `bun run test:watch` | Run tests in watch mode |
| `bun run static-checks` | Full CI suite locally (Biome + TypeScript + commitlint + tests) |

## Schema Migration Utilities

These repo-level scripts are for maintainers migrating existing sites from the
legacy flat schema model to templates, fragments, and recursive fields:

```bash
# Backfill stored schema rows to default kind/mode/route fields
scripts/backfill-schema-model.sh <site-id>

# Preview a site-specific authored-shape migration against JSON input
bun scripts/preview-template-migration.ts <migration-name> <input-json-path>

# Apply a registered authored-shape migration to a site
scripts/run-template-migration.sh <site-id> <migration-name>
```

## Releasing with Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# 1. Create a changeset when you make a noteworthy change
bunx changeset

# 2. Select the affected packages and bump type (patch/minor/major)
# 3. Commit the generated .changeset/*.md file with your PR

# On merge to main:
# - CI runs
# - Convex deploys to production automatically
# - If changesets are present, packages are versioned, published to npm, tagged, and released on GitHub automatically
```

The `@no-mess/api-gateway` package is excluded from releases (it's private and deployed via Wrangler).
Use the manual `Backfill GitHub Releases` workflow if older tags are missing GitHub releases.

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to `main`/`dev` | Static checks, tests, build verification |
| `release.yml` | Push to `main` | Convex production deploy, npm publish, GitHub release creation |
| `backfill-github-releases.yml` | Manual (`workflow_dispatch`) | Create missing GitHub releases for existing tags |
| `auto-approve.yml` | PR to `main` | Auto-approve PRs from repo owner |

Required GitHub Actions secrets:
- `AUTO_APPROVE_APP_ID`
- `AUTO_APPROVE_PRIVATE_KEY`
- `CONVEX_DEPLOY_KEY_PRODUCTION`

### CI Pipeline

1. **Static checks** — Biome lint, commitlint (conventional commits), TypeScript type-check
2. **Test (SDK)** — `@no-mess/client` test suite
3. **Test (Gateway)** — `@no-mess/api-gateway` test suite
4. **Build SDK** — Verify dist outputs exist for all publishable packages

## Code Quality

- **[Biome](https://biomejs.dev/)** — Linting and formatting (no ESLint or Prettier)
- **[commitlint](https://commitlint.js.org/)** — Enforces [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
- **[Husky](https://typicode.github.io/husky/)** — Git hooks:
  - `pre-commit` runs `bun run static-checks`
  - `commit-msg` validates commit message format

## Tech Stack

- **Next.js 16** — App Router, React Compiler enabled
- **React 19** — Server components, hooks, concurrent features
- **Convex** — Backend (database, file storage, HTTP API, real-time subscriptions)
- **Clerk** — Authentication (email/password, Google social login)
- **Tailwind CSS v4** — Styling via PostCSS (`@tailwindcss/postcss`)
- **shadcn/ui** — UI component library (Base UI React primitives, Hugeicons)
- **Cloudflare Workers** — Edge API gateway with rate limiting and caching
- **TypeScript** — Strict mode throughout
- **Vitest** — Test framework
- **Biome** — Linting and formatting

## License

MIT
