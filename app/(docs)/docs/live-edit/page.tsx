import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function LiveEditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Edit</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Live Edit is the primary place to author delivered content. Edit the
          autosaved working draft, save named draft variations, and switch the
          iframe between Draft and Production on the real page.
        </p>
      </div>

      <DocsCallout type="info" title="Route-aware by default">
        <p>
          Live Edit now opens the real route for an entry when one has been
          reported. The legacy preview route remains supported as a fallback.
        </p>
      </DocsCallout>

      <DocsHeading>How It Works</DocsHeading>
      <p className="text-muted-foreground">
        The route-aware provider exchanges the current working draft for the
        iframe session, then overlays editable DOM targets marked with{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          data-no-mess-field
        </code>
        . The dashboard keeps Live Edit active, sends field updates over{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          postMessage
        </code>
        , and uses reported page URLs to reopen the correct route automatically.
        In Draft view, the iframe safely replaces production content only inside
        the iframe. In Production view, the dashboard loads the real published
        page without draft overrides.
      </p>

      <DocsHeading>Deployed Routes</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          On deployed routes, fetch no-mess content at request time so published
          updates appear without redeploy and the iframe always opens the
          current page state.
        </p>
      </div>
      <CodeBlock
        code={`import { createServerNoMessClient } from "@no-mess/client/next";

export const cms = createServerNoMessClient({
  fetch: { cache: "no-store" },
});`}
        language="typescript"
        filename="lib/cms.ts"
      />

      <DocsHeading>Setup</DocsHeading>

      <DocsStep number={1} title="Annotate rendered fields">
        <p>
          Use either raw attributes or the helper component. The field name must
          match your schema exactly.
        </p>
        <CodeBlock
          code={`import { NoMessField } from "@no-mess/client/react";

export function Article({ entry }) {
  return (
    <article>
      <NoMessField as="h1" name="title">
        {entry.title}
      </NoMessField>
      <NoMessField as="p" name="subtitle">
        {entry.subtitle}
      </NoMessField>
      <NoMessField as="div" name="body">
        {entry.body}
      </NoMessField>
    </article>
  );
}`}
          language="tsx"
          filename="components/article.tsx"
        />
      </DocsStep>

      <DocsStep number={2} title="Install the route-aware provider">
        <p>
          Wrap the route tree that renders no-mess content with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NoMessLiveRouteProvider
          </code>
          .
        </p>
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

      <DocsStep number={3} title="Bind the rendered entry">
        <p>
          Call{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry()
          </code>{" "}
          anywhere a route renders an entry. It swaps in the current working
          draft, applies live field overrides, reports the current page URL, and
          emits the entry-bound handshake used by the dashboard warning states.
        </p>
        <CodeBlock
          code={`"use client";

import { useNoMessEditableEntry } from "@no-mess/client/react";

export function ProductStory({ entry }) {
  const editableEntry = useNoMessEditableEntry(entry);

  return (
    <section>
      <h1 data-no-mess-field="title">{editableEntry.title}</h1>
      <p data-no-mess-field="body">{editableEntry.body}</p>
    </section>
  );
}`}
          language="tsx"
          filename="components/product-story.tsx"
        />
      </DocsStep>

      <DocsStep number={4} title="Open Live Edit from the dashboard">
        <p>
          Live Edit is the default authoring flow. The iframe opens the most
          recent reported page URL, autosaves the shared working draft, lets you
          save named checkpoints with <strong>Save As Draft</strong>, and lets
          you publish either the working draft or a saved draft from the publish
          picker. <strong>Select to edit</strong> only toggles overlay picking
          without turning off the draft connection.
        </p>
      </DocsStep>

      <DocsStep number={5} title="Allow iframe embedding">
        <p>
          Deployed routes must allow the dashboard origin in{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors
          </code>{" "}
          or the live-edit iframe will fail to render. Add that directive to
          your existing{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            Content-Security-Policy
          </code>{" "}
          value instead of replacing the rest of your policy.
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
              "default-src 'self'; img-src 'self' data:; frame-ancestors 'self' https://admin.no-mess.xyz;",
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
        <p>
          If you already send a CSP header, keep the existing directives and
          append or merge{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors 'self' https://admin.no-mess.xyz
          </code>
          . For example,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            default-src 'self'; img-src 'self' data:; frame-ancestors 'self'
            https://admin.no-mess.xyz;
          </code>
          .
        </p>
      </DocsStep>

      <DocsHeading>Draft Lifecycle</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          Every entry has one shared working draft. Live Edit autosaves that
          working draft while editors type so the iframe and the form stay in
          sync.
        </p>
        <p>
          Saved drafts are named shared checkpoints or variants. Loading a saved
          draft copies it into the working draft and refreshes the iframe with
          that variation.
        </p>
        <p>
          Publishing can use either the current working draft or a saved draft.
          If you publish a saved draft, that content also becomes the new
          working draft so the editor and production stay aligned.
        </p>
        <p>
          Use the <strong>Draft</strong> and <strong>Production</strong> toggle
          to compare staged changes against the live page. Desktop, tablet, and
          mobile presets, manual resize, and zoom all apply inside the iframe.
        </p>
      </div>

      <DocsHeading>React APIs</DocsHeading>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">API</th>
              <th className="pb-2 font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NoMessLiveRouteProvider
                </code>
              </td>
              <td className="py-2">
                Starts preview and live-edit messaging on normal site routes.
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  useNoMessEditableEntry(entry)
                </code>
              </td>
              <td className="py-2">
                Returns the active draft for the targeted entry and reports the
                current route.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  useNoMessField(fieldName)
                </code>
              </td>
              <td className="py-2">
                Reads the latest unsaved field override from provider context.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>Dashboard Behavior</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          The URL bar persists the last page URL used for the entry. Reported
          page URLs from public views and manually added URLs both appear in the
          dropdown.
        </p>
        <p>
          Live Edit can switch between Draft and Production without leaving the
          page, so editors can compare staged changes against production in the
          same workspace.
        </p>
        <p>
          The standard content editor exposes an <strong>Advanced</strong> /
          <strong>Page URLs</strong> section where editors can add, remove, and
          reorder the default Live Edit route without leaving the entry page.
        </p>
      </div>

      <DocsHeading>Warning States</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          If the route loads but never emits{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess:preview-ready
          </code>
          , the dashboard warns that the page does not include the no-mess
          bridge.
        </p>
        <p>
          If the route is integrated but never emits{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess:entry-bound
          </code>
          , the dashboard warns that the selected entry is not mounted on the
          current route.
        </p>
      </div>

      <DocsHeading>Legacy Compatibility</DocsHeading>
      <p className="text-muted-foreground">
        If you still use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessPreview()
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          useNoMessLiveEdit()
        </code>{" "}
        on{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          /no-mess-preview
        </code>
        , that setup continues to work. Route-aware Live Edit is the recommended
        path for new integrations.
      </p>

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          If draft changes do not appear immediately, confirm the page renders
          the entry through{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessEditableEntry()
          </code>{" "}
          and that editable DOM nodes are annotated.
        </p>
        <p>
          If the route opens but the wrong content is shown, verify the route is
          reporting the selected entry ID and that duplicate page URLs are not
          pointing at different entry types.
        </p>
        <p>
          If publishes only appear after redeploy, the route is probably still
          statically rendered. Switch the no-mess server fetch to{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            cache: "no-store"
          </code>
          .
        </p>
        <p>
          If <strong>Select to edit</strong> appears inactive, the page is
          probably missing annotated fields or the route loaded without the
          bridge/provider.
        </p>
      </div>
    </div>
  );
}
