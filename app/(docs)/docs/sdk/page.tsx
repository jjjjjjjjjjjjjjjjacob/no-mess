import { CodeBlock } from "@/components/docs/code-block";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function SdkPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SDK Usage</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Fetch content, run preview-only pages, or integrate route-aware Live
          Edit on real site routes with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            @no-mess/client
          </code>
          .
        </p>
      </div>

      <DocsHeading>Server-Side Content Fetching</DocsHeading>
      <CodeBlock
        code={`import { createNoMessClient } from "@no-mess/client";

export const cms = createNoMessClient({
  apiKey: process.env.NO_MESS_API_KEY!,
});

const post = await cms.getEntry("blog-post", "hello-world");`}
        language="typescript"
        filename="lib/cms.ts"
      />

      <DocsHeading>Preview-Only Route</DocsHeading>
      <CodeBlock
        code={`"use client";

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
}`}
        language="tsx"
        filename="app/no-mess-preview/page.tsx"
      />

      <DocsHeading>Route-Aware Live Edit</DocsHeading>

      <DocsStep number={1} title="Provider">
        <CodeBlock
          code={`"use client";

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
}`}
          language="tsx"
          filename="app/(site)/layout.tsx"
        />
      </DocsStep>

      <DocsStep number={2} title="Editable entry">
        <CodeBlock
          code={`"use client";

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
}`}
          language="tsx"
          filename="components/blog-article.tsx"
        />
      </DocsStep>

      <DocsHeading>Route Reporting</DocsHeading>
      <p className="text-muted-foreground">
        Route reporting is automatic when you use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessEditableEntry()
        </code>
        . If you need to report manually, use the client method below:
      </p>
      <CodeBlock
        code={`const client = createNoMessClient({
  apiKey: process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!,
});

await client.reportLiveEditRoute({
  entryId: "entry_123",
  url: window.location.href,
});`}
        language="typescript"
      />

      <DocsHeading>React API Summary</DocsHeading>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">API</th>
              <th className="pb-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NoMessPreview
                </code>
              </td>
              <td className="py-2">Preview-only route wrapper.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  useNoMessPreview()
                </code>
              </td>
              <td className="py-2">Hook alternative for preview-only pages.</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NoMessLiveRouteProvider
                </code>
              </td>
              <td className="py-2">
                Route-aware preview and Live Edit provider.
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  useNoMessEditableEntry()
                </code>
              </td>
              <td className="py-2">
                Binds the current route to an entry and returns draft/override
                content when active.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  useNoMessField()
                </code>
              </td>
              <td className="py-2">
                Reads a single field override from provider context.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        See{" "}
        <a href="/docs/preview" className="font-medium text-primary underline">
          Preview Mode
        </a>{" "}
        for setup guidance and{" "}
        <a
          href="/docs/live-edit"
          className="font-medium text-primary underline"
        >
          Live Edit
        </a>{" "}
        for the route-aware workflow and dashboard behavior.
      </p>
    </div>
  );
}
