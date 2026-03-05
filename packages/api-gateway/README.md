# @no-mess/api-gateway

Edge API gateway for [no-mess](https://no-mess.xyz), running on Cloudflare Workers. Sits between client SDKs and the Convex backend, providing rate limiting, caching, and CORS handling.

> **Private package** — not published to npm. Deployed directly via Wrangler.

## Architecture

Every request passes through an 8-step middleware pipeline:

```
Request
  → CORS Preflight (handle OPTIONS)
  → API Key Extraction (Authorization header)
  → Rate Limiting (sliding window, 120 req/min per key)
  → Cache Check (GET requests only)
  → Upstream Proxy (forward to Convex HTTP API)
  → Cache Store (cache successful GETs)
  → Async Logging
  → CORS Headers
Response
```

### Rate Limiting

- **Window**: 60 seconds (sliding)
- **Limit**: 120 requests per API key per minute
- **Storage**: Cloudflare KV (when configured)
- **Response**: HTTP 429 with `Retry-After` header when exceeded

### Caching

- Only **GET** requests are cached
- Cache key includes URL + API key
- Cache-Control: `public, s-maxage=60, stale-while-revalidate=300`

### CORS

- **Allowed origins**: `*`
- **Allowed methods**: GET, POST, OPTIONS
- **Allowed headers**: Authorization, Content-Type
- **Max age**: 86400 (24 hours)

### Proxy Behavior

- Forwards requests to the configured upstream (Convex HTTP API)
- Strips backend-identifying headers (`server`, `x-convex-request-id`)
- Sets `X-Gateway: no-mess-api-gateway` header
- Forwards `CF-Connecting-IP` as `X-Forwarded-For`
- Preserves the `Authorization` header to upstream

## Local Development

```bash
# Start local dev server (via Wrangler)
bun run dev

# Run tests
bun run test

# Type-check
bun run typecheck
```

## Deployment

```bash
bun run deploy
```

This runs `wrangler deploy`, which deploys to Cloudflare Workers using the configuration in `wrangler.toml`.

## Configuration

### wrangler.toml

```toml
name = "no-mess-api-gateway"
main = "src/index.ts"
compatibility_date = "2025-01-15"
compatibility_flags = ["nodejs_compat"]

[vars]
UPSTREAM_URL = "https://your-project.convex.site"
ENVIRONMENT = "development"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `UPSTREAM_URL` | Convex HTTP API URL to proxy requests to |
| `ENVIRONMENT` | `development` or `production` |
| `RATE_LIMIT_KV` | KV namespace binding for rate limit counters (optional) |

## License

MIT
