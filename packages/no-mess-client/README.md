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
```

## API reference

Full documentation at [no-mess.xyz/docs/sdk](https://no-mess.xyz/docs/sdk).

## License

MIT
