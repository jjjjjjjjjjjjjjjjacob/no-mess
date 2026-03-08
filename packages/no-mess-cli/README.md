# no-mess

CLI for the [no-mess](https://no-mess.xyz) headless CMS. Manage content type schemas from your codebase.

## Install

```bash
npm install -g no-mess
# or run directly
bunx no-mess
npx no-mess
```

## Quick Start

```bash
# Scaffold a schema.ts and .env file
no-mess init

# Edit .env or .env.local with your secret API key
# NO_MESS_API_KEY=nm_your_secret_key

# Push your schema to the dashboard
no-mess push

# Watch for changes and sync on save
no-mess dev
```

## Commands

### `no-mess init`

Create a starter `schema.ts` and `.env` file in the current directory.

```bash
no-mess init
no-mess init --schema content/schema.ts
```

- Creates `schema.ts` with an example content type if the file doesn't exist
- Creates `.env` with a `NO_MESS_API_KEY` placeholder if the file doesn't exist
- The CLI also reads `.env.local` if you prefer not to store local secrets in `.env`

### `no-mess push`

Parse your local schema and push it to the no-mess dashboard.

```bash
no-mess push
no-mess push --schema content/schema.ts
```

Returns a list of synced content types with their action (`created` or `updated`).

### `no-mess pull`

Pull schemas from the dashboard and generate a local `schema.ts`.

```bash
no-mess pull
no-mess pull --schema content/schema.ts
no-mess pull --stdout  # print to stdout instead of writing a file
```

### `no-mess dev`

Watch `schema.ts` and automatically push on every save.

```bash
no-mess dev
no-mess dev --schema content/schema.ts
```

Uses a 300ms stability threshold before syncing. Gracefully shuts down on SIGINT/SIGTERM.

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--schema <path>` | `schema.ts` | Path to the schema file |
| `--stdout` | — | Print to stdout instead of writing a file (`pull` only) |
| `--help, -h` | — | Show help |
| `--version, -v` | — | Show version |

## Configuration

The CLI reads environment variables from env files in the current directory with this precedence:

1. Shell-provided environment variables
2. `.env.local`
3. `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `NO_MESS_API_KEY` | Yes | Secret API key (must start with `nm_`) |
| `NO_MESS_API_URL` | No | Custom API URL (defaults to `https://api.nomess.xyz`) |

### API Key Types

- **Secret keys** (`nm_...`) — Required for the CLI. Used for schema management and server-side operations.
- **Publishable keys** (`nm_pub_...`) — Not accepted by the CLI. These are for client-side content fetching only.

Get your API key from the [no-mess dashboard](https://admin.no-mess.xyz) under workspace settings.

## Local Development Against Another Repo

For local CLI development, build the CLI in this repo and invoke the built entrypoint from the consumer project. This is the fastest way to test changes without publishing.

Example: testing against `/Users/jacob/Developer/mershy`

```bash
# Terminal 1: rebuild the SDK when it changes
cd /Users/jacob/Developer/no-mess
bunx tsc -w -p packages/no-mess-client
```

```bash
# Terminal 2: rebuild the CLI when it changes
cd /Users/jacob/Developer/no-mess
bunx tsc -w -p packages/no-mess-cli
```

```bash
# Terminal 3: run the local CLI from the consumer project
cd /Users/jacob/Developer/mershy
bun ../no-mess/packages/no-mess-cli/dist/cli.js init --schema lib/cms/schema.ts
bun ../no-mess/packages/no-mess-cli/dist/cli.js push --schema lib/cms/schema.ts
bun ../no-mess/packages/no-mess-cli/dist/cli.js dev --schema lib/cms/schema.ts
```

Notes:

- `mershy` keeps its CMS code under `lib/cms`, so the schema path is `lib/cms/schema.ts`
- the CLI resolves `.env`, `.env.local`, and relative schema paths from the current working directory, so run it from the consumer project
- `dev` watches schema file changes, but if you change CLI or SDK source you still need to restart the running CLI process after the rebuild finishes

## Schema File

The CLI works with schema files that use `@no-mess/client/schema`:

```ts
import { defineSchema, defineContentType, field } from "@no-mess/client/schema";

export default defineSchema({
  contentTypes: [
    defineContentType("blog-post", {
      name: "Blog Post",
      description: "Articles for the blog",
      fields: {
        title: field.text({ required: true }),
        body: field.textarea({ required: true }),
        publishedAt: field.datetime(),
        featured: field.boolean(),
        category: field.select({
          choices: [
            { label: "Tech", value: "tech" },
            { label: "Design", value: "design" },
          ],
        }),
      },
    }),
  ],
});
```

See the [`@no-mess/client` schema docs](../no-mess-client#schema-builder) for the full field builder API.

## Development

```bash
# Build
bun run build

# Watch mode
bun run dev
```

## License

MIT
