# @no-mess/client

TypeScript SDK for the [no-mess](https://no-mess.xyz) headless CMS.

## Install

```bash
npm install @no-mess/client
# or
bun add @no-mess/client
```

## Schema Builder

Use `@no-mess/client/schema` to define route-bound templates, reusable
fragments, and recursive fields:

```ts
import {
  defineFragment,
  defineSchema,
  defineTemplate,
  field,
} from "@no-mess/client/schema";

const imageWithAlt = defineFragment("image-with-alt", {
  name: "Image With Alt",
  fields: {
    image: field.image({ required: true }),
    alt: field.text(),
  },
});

const homePage = defineTemplate("home-page", {
  name: "Home Page",
  mode: "singleton",
  route: "/",
  fields: {
    hero: field.object({
      fields: {
        headline: field.text({ required: true }),
        slides: field.array({
          of: field.fragment(imageWithAlt),
          minItems: 1,
        }),
      },
    }),
  },
});

export default defineSchema({
  contentTypes: [imageWithAlt, homePage],
});
```

`defineContentType()` remains available as a compatibility alias for template
definitions, but new code should prefer `defineTemplate()` and
`defineFragment()`.

## Fetch Content

```ts
import { createNoMessClient } from "@no-mess/client";

const client = createNoMessClient({
  apiKey: process.env.NO_MESS_API_KEY!,
});

const posts = await client.getEntries("blog-post");
const post = await client.getEntry("blog-post", "hello-world");
```

## Preview-Only Route

Use this when you want a dedicated `/no-mess-preview` page.

```tsx
"use client";

import { NoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  return (
    <NoMessPreview apiKey={process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!}>
      {({ entry, error, isLoading }) => {
        if (isLoading) return <p>Loading preview...</p>;
        if (error) return <p>{error.message}</p>;
        if (!entry) return null;

        return <h1>{entry.title}</h1>;
      }}
    </NoMessPreview>
  );
}
```

## Route-Aware Preview and Live Edit

This is the recommended integration path. It lets the dashboard open real site
routes, apply unsaved iframe-only edits before publish, and store reported
delivery URLs per entry.

### 1. Wrap the route tree

```tsx
"use client";

import { NoMessLiveRouteProvider } from "@no-mess/client/react";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NoMessLiveRouteProvider
      apiKey={process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!}
    >
      {children}
    </NoMessLiveRouteProvider>
  );
}
```

### 2. Bind the rendered entry

```tsx
"use client";

import {
  NoMessField,
  useNoMessEditableEntry,
} from "@no-mess/client/react";

export function BlogArticle({ entry }) {
  const editableEntry = useNoMessEditableEntry(entry);

  return (
    <article>
      <NoMessField as="h1" name="title">
        {editableEntry.title}
      </NoMessField>
      <NoMessField as="div" name="body">
        {editableEntry.body}
      </NoMessField>
    </article>
  );
}
```

`useNoMessEditableEntry()` automatically:
- swaps in draft content for the active iframe session
- applies unsaved field overrides from Live Edit
- reports the current URL for route-aware reopening
- emits the entry-bound signal used by dashboard warnings

## Manual Route Reporting

If you need custom reporting logic, call the client method directly:

```ts
import { createNoMessClient } from "@no-mess/client";

const client = createNoMessClient({
  apiKey: process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!,
});

await client.reportLiveEditRoute({
  entryId: "entry_123",
  url: window.location.href,
});
```

## API Reference

### Content

| Method | Description |
|--------|-------------|
| `client.getSchemas()` | List all template and fragment schemas |
| `client.getSchema(typeSlug)` | Get a single schema by slug |
| `client.getEntries(contentType)` | Fetch all published entries of a template |
| `client.getEntry(contentType, slug)` | Get a single entry by slug |

### Preview / Live Edit

| Method | Description |
|--------|-------------|
| `client.exchangePreviewSession(session)` | Exchange a preview session token for draft content |
| `client.reportLiveEditRoute({ entryId, url? })` | Report the current delivery URL for route-aware Live Edit |

### React (`@no-mess/client/react`)

| API | Description |
|-----|-------------|
| `NoMessPreview` | Preview-only route wrapper |
| `useNoMessPreview(config)` | Hook alternative for preview-only pages |
| `NoMessLiveRouteProvider` | Route-aware provider for real site routes |
| `useNoMessEditableEntry(entry, options?)` | Returns the active draft entry and reports the route |
| `NoMessField` | Convenience component for `data-no-mess-field` annotations |
| `useNoMessField(fieldName)` | Read a single field override from provider context |

## Migration

If you already use `useNoMessPreview()` and `useNoMessLiveEdit()` on
`/no-mess-preview`:

1. Keep the existing preview route in place.
2. Add `NoMessLiveRouteProvider` to the real route tree.
3. Replace direct entry rendering with `useNoMessEditableEntry(entry)` on the
   routes you want Live Edit to open.
4. Add `data-no-mess-field` annotations or `NoMessField` wrappers.

If you do nothing, the legacy preview route keeps working. You only miss the
route-aware Live Edit workflow.

## License

MIT
