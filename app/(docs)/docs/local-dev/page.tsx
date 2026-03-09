import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function LocalDevPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Local Development</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Run route-aware preview and Live Edit against localhost, including
          local dashboard origins, route CSP, and the legacy preview fallback.
        </p>
      </div>

      <DocsHeading>Environment Variables</DocsHeading>
      <CodeBlock
        code={`# Server-side fetches
NO_MESS_API_KEY=nm_your_secret_key
NO_MESS_API_URL=https://your-convex-dev.convex.site

# Client-side preview and live edit
NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY=nm_pub_your_publishable_key
NEXT_PUBLIC_NO_MESS_API_URL=https://your-convex-dev.convex.site`}
        language="bash"
        filename=".env.local"
      />

      <DocsCallout type="warning" title="Use a publishable key in the browser">
        <p>
          Route-aware preview and Live Edit on real pages should use{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            nm_pub_
          </code>{" "}
          keys in client-side code. Keep secret keys on the server only.
        </p>
      </DocsCallout>

      <DocsHeading>Set Local Preview URL</DocsHeading>
      <p className="text-muted-foreground">
        In the no-mess dashboard, set the site preview URL to your local site
        origin, for example{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          http://localhost:3001
        </code>
        . This is the base origin used for preview iframes and route validation.
      </p>

      <DocsHeading>Route-Aware Local Setup</DocsHeading>

      <DocsStep number={1} title="Wrap local routes with the provider">
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
      apiUrl={process.env.NEXT_PUBLIC_NO_MESS_API_URL}
      liveEditConfig={{ adminOrigin: "http://localhost:4567" }}
    >
      {children}
    </NoMessLiveRouteProvider>
  );
}`}
          language="tsx"
          filename="app/(site)/layout.tsx"
        />
      </DocsStep>

      <DocsStep number={2} title="Bind the current entry">
        <CodeBlock
          code={`"use client";

import { useNoMessEditableEntry } from "@no-mess/client/react";

export function BlogArticle({ entry }) {
  const editableEntry = useNoMessEditableEntry(entry);

  return (
    <article>
      <h1 data-no-mess-field="title">{editableEntry.title}</h1>
      <div data-no-mess-field="body">{editableEntry.body}</div>
    </article>
  );
}`}
          language="tsx"
          filename="components/blog-article.tsx"
        />
      </DocsStep>

      <DocsStep number={3} title="Allow localhost iframe embedding">
        <p>
          In local development, the real delivery routes need CSP for the local
          dashboard origin as well as production.
        </p>
        <CodeBlock
          code={`// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://admin.no-mess.xyz http://localhost:4567",
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

      <DocsHeading>Legacy Preview Route</DocsHeading>
      <p className="text-muted-foreground">
        If you still prefer a dedicated local preview route, keep using{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessPreview()
        </code>{" "}
        with a local{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          adminOrigin
        </code>
        :
      </p>
      <CodeBlock
        code={`"use client";

import { useNoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  const { entry, error, isLoading } = useNoMessPreview({
    apiKey: process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!,
    apiUrl: process.env.NEXT_PUBLIC_NO_MESS_API_URL,
    adminOrigin: "http://localhost:4567",
  });

  if (isLoading) return <p>Loading preview...</p>;
  if (error) return <p>{error.message}</p>;
  if (!entry) return null;

  return <h1>{entry.title}</h1>;
}`}
        language="tsx"
        filename="app/no-mess-preview/page.tsx"
      />

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          If the dashboard warns that the bridge is missing, confirm the local
          route is wrapped in{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NoMessLiveRouteProvider
          </code>
          .
        </p>
        <p>
          If the dashboard warns that the entry is not mounted, confirm the page
          actually calls{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry(entry)
          </code>{" "}
          for the selected entry.
        </p>
        <p>
          If route reporting is not working, check the browser network tab for{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /api/live-edit/routes/report
          </code>{" "}
          and verify the client is using a publishable key.
        </p>
      </div>
    </div>
  );
}
