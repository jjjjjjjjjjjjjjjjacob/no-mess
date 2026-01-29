# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**no-mess** is a multi-tenant headless CMS platform built on Convex + Next.js. Currently in early scaffolding phase — see `.agent/plans/` for the full implementation roadmap, data model, and architectural decisions.

## Commands

```bash
# Development
bun dev              # Start Next.js dev server (localhost:3000)
bun run build        # Production build
bun start            # Start production server

# Code Quality
bun run lint         # Lint with Biome (biome check)
bun run format       # Format with Biome (biome format --write)

# shadcn/ui
bunx shadcn@latest add <component>  # Add shadcn/ui components
```

Package manager is **Bun**. No test framework is configured yet.

## Tech Stack

- **Next.js 16** with App Router and React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **React 19**
- **Convex** for backend (database, file storage, HTTP API)
- **Tailwind CSS v4** via PostCSS (not v3 config file — uses `@tailwindcss/postcss` plugin)
- **shadcn/ui** (base-vega style, Hugeicons icon library, CSS variables, Base UI React primitives)
- **Biome** for linting and formatting (not ESLint/Prettier)
- **TypeScript** with strict mode

## Architecture

- App Router structure in `/app`
- Components in `/components`, with shadcn/ui primitives in `/components/ui`
- Convex backend in `/convex` (schema, queries, mutations, actions)
- Utilities in `/lib` (includes `cn()` for Tailwind class merging)
- Hooks in `/hooks`

### Path Aliases

```
@/*           → ./*
@/components  → components/
@/ui          → components/ui/
@/lib         → lib/
@/hooks       → hooks/
```

### Convex Backend

- Convex functions go in `/convex` — queries, mutations, and actions
- Auto-generated types in `/convex/_generated/` (do not edit these)
- No schema.ts yet — the data model in `.agent/plans/no-mess-data-model.md` is the reference for implementation
- Auth planned via Clerk (email/password & Google social login)
- Clerk webhook exposed by Convex at https://<clerk-actions-endpoint>/webhooks/clerk with all user & organizationMembership events

### Styling

- Tailwind v4 with OKLCH color space theme variables in `app/globals.css`
- Dark mode via CSS custom properties (`.dark` class)
- Use `cn()` from `@/lib/utils` for conditional class merging
- Use shadcn/ui components via CLI (`bunx shadcn@latest add <name>`), then iterate with toolcalls

## Code Style

- 2-space indentation (enforced by Biome)
- camelCase for variables/functions, PascalCase for components/classes, SCREAMING_CASE for constants
- kebab-case for TypeScript filenames
- Biome handles both linting and formatting — do not add ESLint or Prettier configs
- `noUnknownAtRules` is disabled in Biome to allow Tailwind CSS `@` directives

## Planning Documentation

The `.agent/plans/` directory is the source of truth for project planning:
- `no-mess-implementation-plan.md` — 8-phase roadmap with task dependencies
- `no-mess-data-model.md` — Complete database schema (15+ tables)
- `no-mess-technical-reference.md` — ADRs, blockers, security, testing strategy
- `no-mess-linear-issues.md` — Linear ticket templates

The project is planned to evolve into a Turborepo monorepo (`apps/admin`, `apps/shopify-app`, `packages/convex`, `packages/no-mess-client`).
