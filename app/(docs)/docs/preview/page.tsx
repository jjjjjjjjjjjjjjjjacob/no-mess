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
          Preview draft content live on your site before publishing. The SDK
          handles the preview handshake automatically.
        </p>
      </div>

      <DocsHeading>Setup</DocsHeading>

      <DocsStep number={1} title="Set your preview URL">
        <p>
          Go to your site&apos;s <strong>Settings</strong> page in the no-mess
          dashboard and enter the base URL of your client site (e.g.,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            https://mysite.com
          </code>
          ). This tells the dashboard where to load your preview.
        </p>
      </DocsStep>

      <DocsStep number={2} title="Add a preview route">
        <p>
          Create a{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /no-mess-preview
          </code>{" "}
          route in your site and use the{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NoMessPreview
          </code>{" "}
          component from the SDK:
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

        return (
          <article>
            <h1>{entry.title}</h1>
            {/* Render your content fields here */}
          </article>
        );
      }}
    </NoMessPreview>
  );
}`}
          language="tsx"
          filename="app/no-mess-preview/page.tsx"
        />
      </DocsStep>

      <DocsStep number={3} title="Configure CSP headers">
        <p>
          Your preview route must allow iframe embedding from the no-mess
          dashboard. Add a{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            Content-Security-Policy
          </code>{" "}
          header with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors
          </code>{" "}
          that includes the dashboard origin:
        </p>
        <CodeBlock
          code={`// next.config.ts
const nextConfig = {
  async headers() {
    return [{
      source: "/no-mess-preview",
      headers: [{
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self' https://admin.no-mess.xyz",
      }],
    }];
  },
};

export default nextConfig;`}
          language="typescript"
          filename="next.config.ts"
        />
        <p className="mt-2">
          For local development, see the environment-aware CSP configuration in
          the{" "}
          <a
            href="/docs/local-dev#configure-csp-headers"
            className="font-medium text-primary underline"
          >
            Local Development
          </a>{" "}
          guide.
        </p>
      </DocsStep>

      <DocsHeading>Hook Alternative</DocsHeading>
      <p className="text-muted-foreground">
        If you prefer hooks over render functions, use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessPreview
        </code>{" "}
        directly:
      </p>
      <CodeBlock
        code={`"use client";

import { useNoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  const { entry, error, isLoading } = useNoMessPreview({
    apiKey: process.env.NEXT_PUBLIC_NO_MESS_PUBLISHABLE_KEY!,
  });

  if (isLoading) return <p>Loading preview...</p>;
  if (error) return <p>Preview error: {error.message}</p>;
  if (!entry) return null;

  return (
    <article>
      <h1>{entry.title}</h1>
      {/* Render your content fields here */}
    </article>
  );
}`}
        language="tsx"
        filename="app/no-mess-preview/page.tsx"
      />

      <DocsHeading as="h3">useNoMessPreview Options</DocsHeading>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Option</th>
              <th className="pb-2 pr-4 font-semibold">Type</th>
              <th className="pb-2 pr-4 font-semibold">Default</th>
              <th className="pb-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  apiKey
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  string
                </code>
              </td>
              <td className="py-2 pr-4">&mdash;</td>
              <td className="py-2">
                Required. Your site&apos;s publishable key (
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  nm_pub_
                </code>
                ) recommended for client-side preview.
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  apiUrl
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  string
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  https://api.nomess.xyz
                </code>
              </td>
              <td className="py-2">
                Override the API endpoint for the preview session exchange.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  adminOrigin
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  string
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  https://admin.no-mess.xyz
                </code>
              </td>
              <td className="py-2">
                The origin of the dashboard sending postMessage events. Set this
                when developing against a local dashboard instance.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>Non-React Frameworks</DocsHeading>
      <p className="text-muted-foreground">
        If you&apos;re not using React, use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          createPreviewHandler()
        </code>{" "}
        from{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          @no-mess/client
        </code>{" "}
        to manage the preview lifecycle manually. It accepts the same options as{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessPreview
        </code>
        .
      </p>
      <CodeBlock
        code={`import { createNoMessClient, createPreviewHandler } from "@no-mess/client";

const client = createNoMessClient({
  apiKey: "nm_pub_your_publishable_key",
  logger: (event) => {
    console.debug(event.code, event.context);
  },
});

const handler = createPreviewHandler({
  client,
  adminOrigin: "https://admin.no-mess.xyz",
  onEntry: (entry) => {
    document.getElementById("preview-title")!.textContent = entry.title;
  },
  onError: (error) => {
    console.error("Preview error:", error.message);
  },
});

// Start listening for postMessage events from the dashboard
handler.start();

// Clean up when the page is destroyed
// handler.cleanup();`}
        language="typescript"
      />

      <DocsCallout type="info" title="Local Development">
        <p>
          Setting up preview for a local dev server? See the{" "}
          <a
            href="/docs/local-dev"
            className="font-medium text-primary underline"
          >
            Local Development
          </a>{" "}
          guide for a complete walkthrough including environment variables, CSP
          configuration with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NODE_ENV
          </code>{" "}
          toggling, and troubleshooting localhost-specific issues.
        </p>
      </DocsCallout>

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">Iframe shows blank page</p>
          <p className="text-sm text-muted-foreground">
            Check that your Content-Security-Policy header allows framing from
            the dashboard origin. For production, this is{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              https://admin.no-mess.xyz
            </code>
            . Open your browser&apos;s developer console and look for CSP
            violation errors.
          </p>
        </div>

        <div>
          <p className="font-semibold">adminOrigin mismatch</p>
          <p className="text-sm text-muted-foreground">
            The{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              adminOrigin
            </code>{" "}
            option must exactly match the origin of the dashboard sending
            postMessage events, including protocol and port. If you are
            developing locally and use{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              http://localhost:3000
            </code>{" "}
            for the dashboard, do not omit{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              adminOrigin
            </code>{" "}
            &mdash; the default is{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              https://admin.no-mess.xyz
            </code>{" "}
            and will not match.
          </p>
        </div>

        <div>
          <p className="font-semibold">Preview not working on localhost</p>
          <p className="text-sm text-muted-foreground">
            Local development requires additional configuration for CSP headers,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              adminOrigin
            </code>
            , and environment variables. See the{" "}
            <a
              href="/docs/local-dev"
              className="font-medium text-primary underline"
            >
              Local Development
            </a>{" "}
            guide for a step-by-step setup.
          </p>
        </div>

        <div>
          <p className="font-semibold">Session expired</p>
          <p className="text-sm text-muted-foreground">
            Preview sessions last 10 minutes. Click <strong>Preview</strong>{" "}
            again in the dashboard to create a new session.
          </p>
        </div>
      </div>
    </div>
  );
}
