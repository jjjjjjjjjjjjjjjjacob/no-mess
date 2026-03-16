import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function GettingStartedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Set up no-mess and start fetching content in minutes.
        </p>
      </div>

      <DocsHeading>What is no-mess?</DocsHeading>
      <p className="text-muted-foreground">
        no-mess is a headless CMS designed for developers who need to ship
        content management to their clients without complexity. You define
        content schemas, your clients edit content, and you fetch it all via a
        TypeScript SDK.
      </p>

      <DocsHeading>Quick Start</DocsHeading>

      <DocsStep number={1} title="Create an account">
        <p>
          Sign up at{" "}
          <a href="/sign-up" className="font-medium text-primary underline">
            no-mess.xyz/sign-up
          </a>{" "}
          with your email and password.
        </p>
      </DocsStep>

      <DocsStep number={2} title="Create a site">
        <p>
          After signing in, you&apos;ll be guided through creating your first
          site. Give it a name and slug. The slug is used in API URLs and must
          be unique.
        </p>
        <p className="mt-2">
          Each site gets two API keys, which you&apos;ll find in the site
          settings page:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Secret key</strong> (
            <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>
            ) &mdash; for server-side code only
          </li>
          <li>
            <strong>Publishable key</strong> (
            <code className="rounded bg-muted px-1 font-mono text-xs">
              nm_pub_
            </code>
            ) &mdash; safe for client-side use
          </li>
        </ul>
      </DocsStep>

      <DocsStep number={3} title="Define a template">
        <p>
          Navigate to <strong>Schemas</strong> and create a template. Use{" "}
          <strong>singleton</strong> for a route-bound page like the homepage
          and <strong>collection</strong> for repeatable entries like blog
          posts. Add fragments when you want reusable nested groups.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <code className="rounded bg-muted px-1 font-mono text-xs">
              hero.slides[]
            </code>{" "}
            (Repeater)
          </li>
          <li>
            <code className="rounded bg-muted px-1 font-mono text-xs">
              coverImage
            </code>{" "}
            (Fragment reference or Image)
          </li>
          <li>
            <code className="rounded bg-muted px-1 font-mono text-xs">seo</code>{" "}
            (Object group)
          </li>
        </ul>
        <DocsCallout type="info" title="Templates vs fragments">
          Templates are the real authoring surfaces. Fragments are reusable
          nested field groups and do not get standalone content entries.
        </DocsCallout>
        <DocsCallout type="tip" title="Prefer code?">
          You can also define schemas in TypeScript using the{" "}
          <a href="/docs/cli" className="font-medium text-primary underline">
            CLI &amp; Schema as Code
          </a>{" "}
          workflow. Run{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess push
          </code>{" "}
          to sync your schema file to the dashboard as drafts, then publish the
          schema in the dashboard before expecting delivery APIs to use it.
        </DocsCallout>
      </DocsStep>

      <DocsStep number={4} title="Create content entries">
        <p>
          Go to <strong>Content</strong>, pick a collection template, and create
          entries. Singleton templates open directly into their authoring
          screen, and fragments are excluded because they are embedded inside
          other templates. Each entry starts as a draft. Click{" "}
          <strong>Publish</strong> when it&apos;s ready.
        </p>
      </DocsStep>

      <DocsStep number={5} title="Connect route-aware preview and Live Edit">
        <p>
          Set the site <strong>Preview URL</strong> to your site origin, then
          add{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NoMessLiveRouteProvider
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry()
          </code>{" "}
          on the routes that render no-mess content. This is the recommended
          integration path for Live Edit. Preview-only routes remain supported
          as a fallback.
        </p>
      </DocsStep>

      <DocsStep number={6} title="Fetch content with the SDK">
        <p>Install the no-mess client in your project:</p>
        <CodeBlock code="npm install @no-mess/client" language="bash" />
        <p className="mt-4">Then fetch your content:</p>
        <CodeBlock
          code={`import { createServerNoMessClient } from "@no-mess/client/next";

const cms = createServerNoMessClient();

// Get all published blog posts
const posts = await cms.getEntries("blog-posts");

// Get a single post by slug
const post = await cms.getEntry("blog-posts", "hello-world");`}
          language="typescript"
        />
      </DocsStep>

      <DocsHeading>Full Example</DocsHeading>
      <p className="text-muted-foreground">
        Here&apos;s a complete Next.js page that fetches and displays blog posts
        from no-mess:
      </p>
      <CodeBlock
        code={`import { createServerNoMessClient } from "@no-mess/client/next";

interface BlogPost {
  slug: string;
  title: string;
  body: string;
  coverImage: string;
  publishedAt: string;
}

const cms = createServerNoMessClient();

export default async function BlogPage() {
  const posts = await cms.getEntries<BlogPost>("blog-posts");

  return (
    <main>
      <h1>Blog</h1>
      {posts.map((post) => (
        <article key={post.slug}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
        </article>
      ))}
    </main>
  );
}`}
        language="tsx"
        filename="app/blog/page.tsx"
      />

      <DocsCallout type="tip">
        Store your secret key in{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NO_MESS_API_KEY
        </code>
        . For client-side code, use the publishable key in{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY
        </code>
        .
      </DocsCallout>

      <DocsHeading>Next Steps</DocsHeading>
      <ul className="list-inside list-disc space-y-2 text-muted-foreground">
        <li>
          <a
            href="/docs/field-types"
            className="font-medium text-primary underline"
          >
            Field Types Reference
          </a>{" "}
          &mdash; learn about primitive fields plus object, array, and fragment
          containers
        </li>
        <li>
          <a href="/docs/cli" className="font-medium text-primary underline">
            CLI &amp; Schema as Code
          </a>{" "}
          &mdash; define schemas in TypeScript and sync with the CLI
        </li>
        <li>
          <a href="/docs/sdk" className="font-medium text-primary underline">
            SDK Usage
          </a>{" "}
          &mdash; type-safe queries and error handling
        </li>
        <li>
          <a href="/docs/api" className="font-medium text-primary underline">
            API Reference
          </a>{" "}
          &mdash; REST endpoints, authentication, and rate limits
        </li>
        <li>
          <a
            href="/docs/shopify"
            className="font-medium text-primary underline"
          >
            Shopify Integration
          </a>{" "}
          &mdash; sync products and collections
        </li>
        <li>
          <a
            href="/docs/preview"
            className="font-medium text-primary underline"
          >
            Preview Mode
          </a>{" "}
          &mdash; route-aware preview and the legacy fallback route
        </li>
        <li>
          <a
            href="/docs/live-edit"
            className="font-medium text-primary underline"
          >
            Live Edit
          </a>{" "}
          &mdash; instant iframe-only edits, URL bar, and delivery URLs
        </li>
        <li>
          <a
            href="/docs/local-dev"
            className="font-medium text-primary underline"
          >
            Local Development
          </a>{" "}
          &mdash; localhost route-aware preview and Live Edit setup
        </li>
      </ul>
    </div>
  );
}
