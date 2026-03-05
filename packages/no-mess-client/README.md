# @no-mess/client

TypeScript SDK for the [no-mess](https://no-mess.xyz) headless CMS.

## Install

```bash
npm install @no-mess/client
# or
bun add @no-mess/client
```

## Usage

### Fetching content

```ts
import { createNoMessClient } from "@no-mess/client";

const client = createNoMessClient({
  apiKey: "your-api-key",
});

// Get all entries of a content type
const posts = await client.getEntries("blog-post");

// Get a single entry by slug
const post = await client.getEntry("blog-post", "hello-world");
```

### Live preview (React)

```tsx
import { useNoMessPreview } from "@no-mess/client/react";

function PreviewPage() {
  const { entry, isLoading, error } = useNoMessPreview({
    apiKey: "your-api-key",
  });

  if (isLoading) return <p>Loading preview...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return <h1>{entry?.fields.title}</h1>;
}
```

The `useNoMessPreview` hook handles the postMessage handshake between the no-mess admin dashboard and your preview iframe automatically.

### Shopify data

```ts
const products = await client.getProducts();
const product = await client.getProduct("product-handle");
const collections = await client.getCollections();
const collection = await client.getCollection("collection-handle");
```

## Configuration

```ts
const client = createNoMessClient({
  apiKey: "nm_...",           // Required — secret or publishable key
  apiUrl: "https://...",      // Optional — defaults to https://api.no-mess.xyz
});
```

### API Key Types

- **Secret keys** (`nm_...`) — Full access. Use server-side only.
- **Publishable keys** (`nm_pub_...`) — Read-only access to published content. Safe for client-side use.

## API Reference

### Content

| Method | Description |
|--------|-------------|
| `client.getSchemas()` | List all content type schemas |
| `client.getSchema(typeSlug)` | Get a single schema by slug |
| `client.getEntries(contentType)` | Fetch all published entries of a content type |
| `client.getEntry(contentType, slug)` | Get a single entry by slug |

### Shopify

| Method | Description |
|--------|-------------|
| `client.getProducts()` | List all synced Shopify products |
| `client.getProduct(handle)` | Get a product by handle |
| `client.getCollections()` | List all synced Shopify collections |
| `client.getCollection(handle)` | Get a collection by handle |

### Preview

| Method | Description |
|--------|-------------|
| `client.exchangePreviewSession(session)` | Exchange a preview session token (HMAC-SHA256 auth) |

### React Hooks (`@no-mess/client/react`)

| Hook | Description |
|------|-------------|
| `useNoMessPreview(config)` | Subscribe to live preview updates in an iframe |
| `useNoMessLiveEdit(config)` | Enable live editing with field-level updates |

## Schema Builder

The `@no-mess/client/schema` export provides helpers for defining content type schemas in code. Used by the [no-mess CLI](../no-mess-cli) to push and pull schemas.

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
        heroImage: field.image(),
        publishedAt: field.datetime(),
        featured: field.boolean(),
        externalUrl: field.url(),
        category: field.select({
          choices: [
            { label: "Tech", value: "tech" },
            { label: "Design", value: "design" },
          ],
        }),
        relatedProduct: field.shopifyProduct(),
        featuredCollection: field.shopifyCollection(),
      },
    }),
  ],
});
```

### Field Types

| Builder | Type | Description |
|---------|------|-------------|
| `field.text()` | `text` | Plain text input |
| `field.textarea()` | `textarea` | Multi-line text |
| `field.number()` | `number` | Numeric value |
| `field.boolean()` | `boolean` | True/false toggle |
| `field.datetime()` | `datetime` | Date/time picker |
| `field.url()` | `url` | URL field |
| `field.image()` | `image` | Image upload |
| `field.select(opts)` | `select` | Dropdown with choices (requires `choices` array) |
| `field.shopifyProduct()` | `shopifyProduct` | Shopify product reference |
| `field.shopifyCollection()` | `shopifyCollection` | Shopify collection reference |

### Field Options

All field builders accept an options object:

```ts
field.text({
  required: true,        // Whether the field is required (default: false)
  description: "...",    // Help text shown in the dashboard
})
```

The `select` builder additionally requires a `choices` array:

```ts
field.select({
  required: true,
  choices: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
  ],
})
```

### Schema Utilities

| Function | Description |
|----------|-------------|
| `defineSchema({ contentTypes })` | Define a complete schema with content types |
| `defineContentType(slug, options)` | Define a single content type |
| `parseSchemaSource(source)` | Parse a schema.ts source string into a schema definition |
| `generateSchemaSource(schema)` | Generate schema.ts source from a schema definition |
| `generateContentTypeSource(contentType)` | Generate source for a single content type |

## License

MIT
