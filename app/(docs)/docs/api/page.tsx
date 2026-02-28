import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";

export default function ApiReferencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          REST API endpoints for fetching content, Shopify data, and managing
          preview sessions.
        </p>
      </div>

      <DocsHeading>Base URL</DocsHeading>
      <p className="text-muted-foreground">
        All requests go through the no-mess API gateway:
      </p>
      <CodeBlock code="https://api.no-mess.xyz" language="bash" />
      <p className="mt-2 text-sm text-muted-foreground">
        During local development, you can bypass the gateway and call your
        Convex deployment directly by passing{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">apiUrl</code>{" "}
        to the SDK client. See the{" "}
        <a
          href="/docs/local-dev"
          className="font-medium text-primary underline"
        >
          Local Development
        </a>{" "}
        guide for details.
      </p>

      <DocsHeading>Authentication</DocsHeading>
      <p className="text-muted-foreground">
        All requests require an API key passed via the{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          Authorization
        </code>{" "}
        header. no-mess provides two key types:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
        <li>
          <strong>Secret key</strong> (
          <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>)
          &mdash; Server-side only. Never expose in client-side code.
        </li>
        <li>
          <strong>Publishable key</strong> (
          <code className="rounded bg-muted px-1 font-mono text-xs">
            nm_pub_
          </code>
          ) &mdash; Safe for client-side use. Read-only access to published
          content.
        </li>
      </ul>
      <p className="mt-2 text-muted-foreground">
        Both key types are accepted on all read-only endpoints. Find your keys
        in your site&apos;s Settings page.
      </p>
      <CodeBlock
        code={`curl -H "Authorization: Bearer nm_pub_your_publishable_key" \\
  https://api.no-mess.xyz/api/content/blog-posts`}
        language="bash"
      />

      <DocsCallout type="warning" title="Keep your secret key safe">
        Never expose your secret key (
        <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>) in
        client-side JavaScript. Use the publishable key (
        <code className="rounded bg-muted px-1 font-mono text-xs">nm_pub_</code>
        ) for browser environments and the secret key for server-side code only.
      </DocsCallout>

      <DocsHeading>Content Endpoints</DocsHeading>

      <DocsHeading as="h3">List Entries</DocsHeading>
      <p className="text-muted-foreground">
        Returns all published entries for a given content type.
      </p>
      <CodeBlock
        code={`GET /api/content/{contentType}

# Example
GET /api/content/blog-posts`}
        language="bash"
      />
      <p className="mt-2 text-sm font-medium">Response:</p>
      <CodeBlock
        code={`{
  "entries": [
    {
      "_id": "abc123",
      "slug": "hello-world",
      "title": "Hello World",
      "body": "Welcome to my blog.",
      "coverImage": "https://...",
      "publishedAt": "2025-01-15T12:00:00Z",
      "_createdAt": "2025-01-10T09:00:00Z",
      "_updatedAt": "2025-01-15T12:00:00Z"
    }
  ]
}`}
        language="json"
      />

      <DocsHeading as="h3">Get Single Entry</DocsHeading>
      <p className="text-muted-foreground">
        Returns a single published entry by content type and slug.
      </p>
      <CodeBlock
        code={`GET /api/content/{contentType}/{slug}

# Example
GET /api/content/blog-posts/hello-world`}
        language="bash"
      />
      <p className="mt-2 text-sm font-medium">Response:</p>
      <CodeBlock
        code={`{
  "entry": {
    "_id": "abc123",
    "slug": "hello-world",
    "title": "Hello World",
    "body": "Welcome to my blog.",
    "coverImage": "https://...",
    "publishedAt": "2025-01-15T12:00:00Z",
    "_createdAt": "2025-01-10T09:00:00Z",
    "_updatedAt": "2025-01-15T12:00:00Z"
  }
}`}
        language="json"
      />

      <DocsHeading>Shopify Endpoints</DocsHeading>
      <p className="text-muted-foreground">
        If your site has a connected Shopify store, these endpoints return
        synced product and collection data.
      </p>

      <DocsHeading as="h3">Products</DocsHeading>
      <CodeBlock
        code={`# List all synced products
GET /api/shopify/products

# Get a single product by handle
GET /api/shopify/products/{handle}

# Example
GET /api/shopify/products/classic-tee`}
        language="bash"
      />
      <p className="mt-2 text-sm font-medium">List response:</p>
      <CodeBlock
        code={`{
  "products": [
    {
      "handle": "classic-tee",
      "title": "Classic Tee",
      "description": "A timeless cotton t-shirt.",
      "vendor": "My Store",
      "productType": "T-Shirts",
      "variants": [...],
      "images": [...]
    }
  ]
}`}
        language="json"
      />

      <DocsHeading as="h3">Collections</DocsHeading>
      <CodeBlock
        code={`# List all synced collections
GET /api/shopify/collections

# Get a single collection by handle
GET /api/shopify/collections/{handle}

# Example
GET /api/shopify/collections/summer-sale`}
        language="bash"
      />
      <p className="mt-2 text-sm font-medium">List response:</p>
      <CodeBlock
        code={`{
  "collections": [
    {
      "handle": "summer-sale",
      "title": "Summer Sale",
      "description": "Hot deals for the summer season.",
      "image": "https://...",
      "products": [...]
    }
  ]
}`}
        language="json"
      />

      <DocsHeading>Preview Exchange</DocsHeading>
      <p className="text-muted-foreground">
        Exchanges an HMAC-SHA256 proof for draft content. This endpoint is used
        internally by the SDK&apos;s{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          exchangePreviewSession()
        </code>{" "}
        method.
      </p>
      <CodeBlock
        code={`POST /api/preview/exchange

Content-Type: application/json
Authorization: Bearer nm_your_api_key`}
        language="bash"
      />
      <p className="mt-2 text-sm font-medium">Request body:</p>
      <CodeBlock
        code={`{
  "sessionId": "ps_abc123",
  "timestamp": "1706640000",
  "proof": "a1b2c3d4e5f6..."
}`}
        language="json"
      />
      <p className="mt-2 text-sm font-medium">Response:</p>
      <CodeBlock
        code={`{
  "entry": {
    "_id": "abc123",
    "slug": "draft-post",
    "title": "My Draft Post",
    "body": "Work in progress...",
    "_createdAt": "2025-01-20T09:00:00Z",
    "_updatedAt": "2025-01-20T10:30:00Z"
  },
  "sessionId": "ps_abc123",
  "expiresAt": "2025-01-20T10:40:00Z"
}`}
        language="json"
      />

      <DocsCallout type="info" title="SDK Handles This Automatically">
        You typically do not need to call this endpoint directly. The SDK&apos;s{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          createPreviewHandler()
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          exchangePreviewSession()
        </code>{" "}
        methods handle proof generation and the exchange for you. See the{" "}
        <a href="/docs/preview" className="font-medium text-primary underline">
          Preview Mode
        </a>{" "}
        docs for a full guide.
      </DocsCallout>

      <DocsHeading>Rate Limiting</DocsHeading>
      <p className="text-muted-foreground">
        The API gateway enforces a rate limit of{" "}
        <strong>120 requests per minute per API key</strong>. If you exceed this
        limit, you will receive a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          429 Too Many Requests
        </code>{" "}
        response with a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          Retry-After
        </code>{" "}
        header indicating how many seconds to wait.
      </p>
      <CodeBlock
        code={`HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 12

{
  "error": "Rate limit exceeded. Try again in 12 seconds."
}`}
        language="bash"
      />

      <DocsHeading>Caching</DocsHeading>
      <p className="text-muted-foreground">
        GET responses are cached at the edge for 60 seconds with a
        stale-while-revalidate window of 300 seconds. POST requests (such as the
        preview exchange) are never cached.
      </p>
      <CodeBlock
        code={`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`}
        language="bash"
      />
      <DocsCallout type="tip" title="Cache Busting">
        Content updates in the no-mess dashboard automatically purge the edge
        cache for affected entries. You do not need to manually bust caches
        after publishing.
      </DocsCallout>

      <DocsHeading>Error Responses</DocsHeading>
      <p className="text-muted-foreground">
        All errors return JSON with an{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">error</code>{" "}
        field and an appropriate HTTP status code.
      </p>
      <CodeBlock
        code={`{
  "error": "Entry not found"
}`}
        language="json"
      />
      <p className="mt-4 text-sm font-medium">Common status codes:</p>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Status</th>
              <th className="pb-2 pr-4 font-semibold">Meaning</th>
              <th className="pb-2 font-semibold">Example</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  400
                </code>
              </td>
              <td className="py-2 pr-4">Bad Request</td>
              <td className="py-2">Missing or invalid request parameters</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  401
                </code>
              </td>
              <td className="py-2 pr-4">Unauthorized</td>
              <td className="py-2">Missing or invalid API key</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  404
                </code>
              </td>
              <td className="py-2 pr-4">Not Found</td>
              <td className="py-2">Content type or entry does not exist</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  429
                </code>
              </td>
              <td className="py-2 pr-4">Too Many Requests</td>
              <td className="py-2">
                Rate limit exceeded (check Retry-After header)
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  500
                </code>
              </td>
              <td className="py-2 pr-4">Internal Server Error</td>
              <td className="py-2">Unexpected server error</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>CORS</DocsHeading>
      <p className="text-muted-foreground">
        The API gateway allows requests from all origins. The following CORS
        headers are sent on every response:
      </p>
      <CodeBlock
        code={`Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type`}
        language="bash"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Preflight{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">OPTIONS</code>{" "}
        requests are handled automatically by the gateway and return a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">204</code>{" "}
        with the appropriate headers.
      </p>
    </div>
  );
}
