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

# Edit .env with your secret API key
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

The CLI reads environment variables from a `.env` file in the current directory.

| Variable | Required | Description |
|----------|----------|-------------|
| `NO_MESS_API_KEY` | Yes | Secret API key (must start with `nm_`) |
| `NO_MESS_API_URL` | No | Custom API URL (defaults to `https://api.no-mess.xyz`) |

### API Key Types

- **Secret keys** (`nm_...`) — Required for the CLI. Used for schema management and server-side operations.
- **Publishable keys** (`nm_pub_...`) — Not accepted by the CLI. These are for client-side content fetching only.

Get your API key from the [no-mess dashboard](https://admin.no-mess.xyz) under workspace settings.

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
