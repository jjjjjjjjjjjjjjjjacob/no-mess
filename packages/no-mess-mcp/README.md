# @no-mess/mcp

MCP server for the [no-mess](https://no-mess.xyz) headless CMS — schema introspection and content tools for AI coding agents.

## What is this?

This package exposes your no-mess CMS data as [Model Context Protocol](https://modelcontextprotocol.io/) tools. AI coding agents (Claude Code, Cursor, VS Code Copilot, etc.) can query your content types, entries, and Shopify data directly from the editor.

## Install

```bash
npm install -g @no-mess/mcp
# or
bun add -g @no-mess/mcp
```

## Available Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `get_schemas` | — | List all content type schemas with TypeScript interfaces and field definitions |
| `get_schema` | `typeSlug` | Get a single content type schema by slug |
| `get_entries` | `typeSlug` | Fetch all published entries of a content type |
| `get_entry` | `typeSlug`, `entrySlug` | Get a single entry by type and entry slug |
| `get_products` | — | List all synced Shopify products |
| `get_product` | `handle` | Get a Shopify product by handle |
| `get_collections` | — | List all synced Shopify collections |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NO_MESS_API_KEY` | Yes | Secret API key (starts with `nm_`) |
| `NO_MESS_API_URL` | No | Custom API URL (defaults to `https://api.no-mess.xyz`) |

## IDE Setup

### Claude Code

Add to your project's `.claude/settings.json` (or `~/.claude/settings.json` for global):

```json
{
  "mcpServers": {
    "no-mess": {
      "command": "npx",
      "args": ["-y", "@no-mess/mcp"],
      "env": {
        "NO_MESS_API_KEY": "nm_your_secret_key"
      }
    }
  }
}
```

### VS Code / Cursor

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "no-mess": {
      "command": "npx",
      "args": ["-y", "@no-mess/mcp"],
      "env": {
        "NO_MESS_API_KEY": "nm_your_secret_key"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "no-mess": {
      "command": "npx",
      "args": ["-y", "@no-mess/mcp"],
      "env": {
        "NO_MESS_API_KEY": "nm_your_secret_key"
      }
    }
  }
}
```

## Development

```bash
# Build
bun run build
```

## License

MIT
