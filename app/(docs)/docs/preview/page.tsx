import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function PreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preview Mode</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Preview drafts on the real route they are delivered to. The
          recommended setup is route-aware and works on normal pages, while the
          legacy{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /no-mess-preview
          </code>{" "}
          route remains supported as a fallback.
        </p>
      </div>

      <DocsCallout type="info" title="Preview URL">
        <p>
          In site settings, <strong>Preview URL</strong> is the base URL of your
          site, for example{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            https://mysite.com
          </code>
          . no-mess uses it to build preview and Live Edit iframe URLs. It is no
          longer just a preview-only endpoint.
        </p>
      </DocsCallout>

      <DocsHeading>Recommended Setup</DocsHeading>

      <DocsStep number={1} title="Wrap route-aware pages">
        <p>
          Add{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NoMessLiveRouteProvider
          </code>{" "}
          near the route tree that renders no-mess content.
        </p>
        <CodeBlock
          code={`"use client";

import { NoMessLiveRouteProvider } from "@no-mess/client/react";

export default function MarketingLayout({
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
}`}
          language="tsx"
          filename="app/(site)/layout.tsx"
        />
      </DocsStep>

      <DocsStep number={2} title="Bind each rendered entry">
        <p>
          Wherever a route renders a no-mess entry, call{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry()
          </code>
          . This swaps in the active draft when the iframe session targets that
          entry and reports the current route back to no-mess.
        </p>
        <CodeBlock
          code={`"use client";

import {
  NoMessField,
  useNoMessEditableEntry,
} from "@no-mess/client/react";

type BlogEntry = {
  _id: string;
  slug: string;
  title: string;
  body: string;
  heroImage?: string;
};

export function BlogArticle({ entry }: { entry: BlogEntry }) {
  const editableEntry = useNoMessEditableEntry(entry);

  return (
    <article>
      <NoMessField as="h1" name="title">
        {editableEntry.title}
      </NoMessField>
      <NoMessField as="img" name="heroImage" src={editableEntry.heroImage} />
      <NoMessField as="div" name="body">
        {editableEntry.body}
      </NoMessField>
    </article>
  );
}`}
          language="tsx"
          filename="components/blog-article.tsx"
        />
      </DocsStep>

      <DocsStep number={3} title="Allow iframe embedding">
        <p>
          Route-aware preview loads your real page inside the no-mess iframe, so
          the actual delivery routes must allow the dashboard origin in{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors
          </code>
          .
        </p>
        <CodeBlock
          code={`// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/blog/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://admin.no-mess.xyz",
          },
        ],
      },
    ];
  },
};

export default nextConfig;`}
          language="typescript"
          filename="next.config.ts"
        />
      </DocsStep>

      <DocsHeading>Legacy Fallback</DocsHeading>
      <p className="text-muted-foreground">
        If you already have a dedicated preview route, keep using{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NoMessPreview
        </code>{" "}
        or{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessPreview
        </code>
        . Live Edit falls back to this route when no real delivery URL has been
        reported yet.
      </p>
      <CodeBlock
        code={`"use client";

import { NoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  return (
    <NoMessPreview apiKey={process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!}>
      {({ entry, error, isLoading }) => {
        if (isLoading) return <p>Loading preview...</p>;
        if (error) return <p>Preview error: {error.message}</p>;
        if (!entry) return null;

        return <article><h1>{entry.title}</h1></article>;
      }}
    </NoMessPreview>
  );
}`}
        language="tsx"
        filename="app/no-mess-preview/page.tsx"
      />

      <DocsHeading>Fallback Behavior</DocsHeading>
      <p className="text-muted-foreground">
        no-mess chooses the most recent reported route for an entry when Live
        Edit opens. If no route has been reported, it falls back to{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          /no-mess-preview
        </code>
        . If a route loads without the no-mess bridge, the dashboard keeps the
        page visible and shows a warning instead of redirecting.
      </p>

      <DocsHeading>Migration Notes</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          If you already have{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /no-mess-preview
          </code>
          , you do not need to remove it. Add the route-aware provider and hook
          gradually to the real routes you want Live Edit to open.
        </p>
        <p>
          If you do nothing, preview-only routes continue to work exactly as
          before. You only miss real-route auto-navigation, stored delivery
          URLs, and iframe-only unsaved updates on production routes.
        </p>
      </div>

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          If the iframe is blank, check CSP and confirm the real route allows{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            https://admin.no-mess.xyz
          </code>{" "}
          in{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors
          </code>
          .
        </p>
        <p>
          If Live Edit opens the wrong page, confirm the route renders the entry
          through{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry()
          </code>{" "}
          and that the route report endpoint is being called from that page.
        </p>
      </div>
    </div>
  );
}
