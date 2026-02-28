import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";

export default function SdkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SDK Usage</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Type-safe content fetching with the @no-mess/client TypeScript SDK.
        </p>
      </div>

      <DocsHeading>Installation</DocsHeading>
      <CodeBlock code="npm install @no-mess/client" language="bash" />

      <DocsHeading>Initialization</DocsHeading>
      <p className="text-muted-foreground">
        Create a client instance with your site&apos;s API key. Find your keys
        in your site&apos;s Settings page.
      </p>
      <CodeBlock
        code={`// Server-side (Next.js server components, API routes, etc.)
import { createNoMessClient } from "@no-mess/client";

const cms = createNoMessClient({
  apiKey: process.env.NO_MESS_SECRET_KEY!,
});`}
        language="typescript"
        filename="lib/cms.ts"
      />
      <CodeBlock
        code={`// Client-side (browser, React components, preview pages)
import { createNoMessClient } from "@no-mess/client";

const cms = createNoMessClient({
  apiKey: process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!,
});`}
        language="typescript"
        filename="lib/cms-client.ts"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        The{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">apiUrl</code>{" "}
        option is optional and defaults to{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          https://api.no-mess.xyz
        </code>
        . For self-hosted or development setups, you can pass a custom{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">apiUrl</code>.
      </p>

      <DocsCallout type="warning" title="Use the right key for the environment">
        Use your <strong>secret key</strong> (
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NO_MESS_SECRET_KEY
        </code>
        ) in server-side code only. For client-side code, use the{" "}
        <strong>publishable key</strong> (
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY
        </code>
        ). The SDK will warn you if it detects a secret key being used in the
        browser.
      </DocsCallout>

      <DocsCallout type="tip">
        Create a single client instance in a shared module and import it
        wherever you need to fetch content. The client is stateless and safe to
        reuse.
      </DocsCallout>

      <DocsHeading>Content Queries</DocsHeading>

      <DocsHeading as="h3">Get All Entries</DocsHeading>
      <p className="text-muted-foreground">
        Fetch all published entries of a content type. Returns an array.
      </p>
      <CodeBlock
        code={`const posts = await cms.getEntries("blog-posts");
// Returns: BlogPost[]`}
        language="typescript"
      />

      <DocsHeading as="h3">Get a Single Entry</DocsHeading>
      <p className="text-muted-foreground">
        Fetch a single entry by its content type and slug.
      </p>
      <CodeBlock
        code={`const post = await cms.getEntry("blog-posts", "hello-world");
// Returns: BlogPost`}
        language="typescript"
      />

      <DocsHeading>TypeScript Generics</DocsHeading>
      <p className="text-muted-foreground">
        Define an interface matching your content type&apos;s fields, then pass
        it as a generic to get type-safe results:
      </p>
      <CodeBlock
        code={`interface BlogPost {
  slug: string;
  title: string;
  body: string;
  coverImage: string;
  publishedAt: string;
  featured: boolean;
}

// Fully typed results
const posts = await cms.getEntries<BlogPost>("blog-posts");
const post = await cms.getEntry<BlogPost>("blog-posts", "hello-world");

// post.title  -> string
// post.body   -> string
// post.featured -> boolean`}
        language="typescript"
      />

      <DocsCallout type="info">
        The generic type extends{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NoMessEntry
        </code>
        , which includes{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">slug</code>,{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">title</code>,{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">_id</code>,{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          _createdAt
        </code>
        , and{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          _updatedAt
        </code>
        . You only need to add your custom fields to the interface.
      </DocsCallout>

      <DocsHeading>Shopify Queries</DocsHeading>
      <p className="text-muted-foreground">
        If you&apos;ve connected Shopify, the SDK provides methods for querying
        synced products and collections.
      </p>
      <CodeBlock
        code={`// Get all synced products
const products = await cms.getProducts();

// Get a single product by handle
const product = await cms.getProduct("classic-tee");

// Get all collections
const collections = await cms.getCollections();

// Get a single collection by handle
const collection = await cms.getCollection("summer-sale");`}
        language="typescript"
      />

      <DocsHeading>Error Handling</DocsHeading>
      <p className="text-muted-foreground">
        The SDK throws a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NoMessError
        </code>{" "}
        for API errors. It includes the HTTP status code.
      </p>
      <CodeBlock
        code={`import { NoMessError } from "@no-mess/client";

try {
  const post = await cms.getEntry("blog-posts", "nonexistent");
} catch (error) {
  if (error instanceof NoMessError) {
    console.error(error.message); // "Entry not found"
    console.error(error.status);  // 404
  }
}`}
        language="typescript"
      />

      <DocsHeading>Preview Mode</DocsHeading>
      <p className="text-muted-foreground">
        The SDK includes React bindings for zero-config preview. Add a preview
        route to your site and the SDK handles the rest:
      </p>
      <CodeBlock
        code={`import { NoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  return (
    <NoMessPreview apiKey={process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!}>
      {({ entry, error, isLoading }) => {
        if (isLoading) return <p>Loading preview...</p>;
        if (error) return <p>Error: {error.message}</p>;
        if (!entry) return null;
        return <h1>{entry.title}</h1>;
      }}
    </NoMessPreview>
  );
}`}
        language="tsx"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        See the{" "}
        <a href="/docs/preview" className="font-medium text-primary underline">
          Preview Mode
        </a>{" "}
        docs for the full setup guide.
      </p>

      <DocsCallout type="tip" title="Non-React Frameworks">
        For non-React frameworks, use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          createPreviewHandler()
        </code>{" "}
        from{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          @no-mess/client
        </code>{" "}
        directly to manage the preview lifecycle. See the{" "}
        <a
          href="/docs/preview#non-react-frameworks"
          className="font-medium text-primary underline"
        >
          Non-React Frameworks
        </a>{" "}
        section on the Preview Mode page for a full code example.
      </DocsCallout>

      <DocsHeading>Full Example</DocsHeading>
      <p className="text-muted-foreground">
        A complete Next.js App Router page with typed content fetching:
      </p>
      <CodeBlock
        code={`import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { NoMessError } from "@no-mess/client";

interface BlogPost {
  slug: string;
  title: string;
  body: string;
  coverImage: string;
  publishedAt: string;
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const post = await cms.getEntry<BlogPost>("blog-posts", slug);
    return (
      <article>
        <h1>{post.title}</h1>
        <img src={post.coverImage} alt={post.title} />
        <p>{post.body}</p>
      </article>
    );
  } catch (error) {
    if (error instanceof NoMessError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}`}
        language="tsx"
        filename="app/blog/[slug]/page.tsx"
      />
    </div>
  );
}
