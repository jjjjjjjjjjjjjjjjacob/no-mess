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
          Edit content fields in the admin panel and see changes reflected
          instantly in a live preview. Click elements in the preview to jump
          directly to the corresponding field.
        </p>
      </div>

      <DocsCallout type="info" title="Prerequisites">
        <p>
          Live Edit builds on{" "}
          <a
            href="/docs/preview"
            className="font-medium text-primary underline"
          >
            Preview Mode
          </a>
          . Make sure you&apos;ve completed the preview setup (preview URL,
          preview route, CSP headers) before enabling Live Edit.
        </p>
      </DocsCallout>

      <DocsHeading>How it works</DocsHeading>
      <p className="text-muted-foreground">
        Live Edit uses{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          data-no-mess-field
        </code>{" "}
        attributes on your markup to identify which DOM elements correspond to
        CMS fields. When you enter Live Edit mode from the dashboard, the SDK
        scans the page for these annotations and draws highlight overlays on
        each one. Clicking an overlay tells the admin panel which field to
        focus, and editing a field in the admin sends real-time updates to the
        preview.
      </p>

      <DocsHeading>Setup</DocsHeading>

      <DocsStep number={1} title="Annotate your markup">
        <p>
          Add{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            data-no-mess-field
          </code>{" "}
          attributes to the elements that render your CMS content. The attribute
          value must match the field name in your content type schema.
        </p>
        <CodeBlock
          code={`<article>
  <h1 data-no-mess-field="title">{entry.title}</h1>
  <p data-no-mess-field="subtitle">{entry.subtitle}</p>
  <img data-no-mess-field="heroImage" src={entry.heroImage} alt="" />
  <div data-no-mess-field="body">{entry.body}</div>
</article>`}
          language="html"
          filename="your-template.tsx"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Multiple elements can share the same field name &mdash; all of them
          will be highlighted and updated together.
        </p>
      </DocsStep>

      <DocsStep number={2} title="Add the live edit handler">
        <p>
          In your preview route, initialize the live edit handler alongside your
          existing preview setup. For <strong>React</strong>, use the{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessLiveEdit
          </code>{" "}
          hook:
        </p>
        <CodeBlock
          code={`"use client";

import { useNoMessPreview, useNoMessLiveEdit } from "@no-mess/client/react";

export default function PreviewPage() {
  const { entry, error, isLoading } = useNoMessPreview({
    apiKey: process.env.NEXT_PUBLIC_NO_MESS_API_KEY!,
  });

  const { isLiveEditActive, fieldOverrides } = useNoMessLiveEdit({
    // adminOrigin: "http://localhost:3000", // for local dev
  });

  if (isLoading) return <p>Loading preview...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!entry) return null;

  // Use overrides for real-time edits, falling back to entry data
  const title = (fieldOverrides.title as string) ?? entry.title;
  const subtitle = (fieldOverrides.subtitle as string) ?? entry.subtitle;

  return (
    <article>
      <h1 data-no-mess-field="title">{title}</h1>
      <p data-no-mess-field="subtitle">{subtitle}</p>
    </article>
  );
}`}
          language="tsx"
          filename="app/no-mess-preview/page.tsx"
        />
      </DocsStep>

      <DocsStep number={3} title="Enter Live Edit mode">
        <p>
          In the no-mess dashboard, navigate to your entry and click the{" "}
          <strong>Live Edit</strong> button, or use the{" "}
          <strong>Live Edit</strong> tab in the site navigation. The dashboard
          will open a split-view with the field editor on the left and the live
          preview on the right.
        </p>
      </DocsStep>

      <DocsHeading>React Hook Reference</DocsHeading>
      <DocsHeading as="h3">useNoMessLiveEdit</DocsHeading>
      <p className="text-muted-foreground">
        Returns the live edit state for use in your preview component.
      </p>
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
                The origin of the dashboard. Override for local development.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading as="h3">Return value</DocsHeading>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Property</th>
              <th className="pb-2 pr-4 font-semibold">Type</th>
              <th className="pb-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  isLiveEditActive
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  boolean
                </code>
              </td>
              <td className="py-2">
                Whether the admin dashboard has activated live edit mode.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  fieldOverrides
                </code>
              </td>
              <td className="py-2 pr-4">
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  {"Record<string, unknown>"}
                </code>
              </td>
              <td className="py-2">
                Field values sent from the admin panel during live editing. Use{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  fieldOverrides.fieldName ?? entry.fieldName
                </code>{" "}
                to display the most recent value.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>Non-React Frameworks</DocsHeading>
      <p className="text-muted-foreground">
        Use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          createLiveEditHandler()
        </code>{" "}
        from{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          @no-mess/client
        </code>{" "}
        for frameworks other than React. The handler manages overlay creation,
        field highlighting, and postMessage communication.
      </p>
      <CodeBlock
        code={`import { createLiveEditHandler } from "@no-mess/client";

const handle = createLiveEditHandler({
  adminOrigin: "https://admin.no-mess.xyz",
  onFieldClicked: (fieldName) => {
    console.log("User clicked field:", fieldName);
  },
  onEnter: () => console.log("Live edit activated"),
  onExit: () => console.log("Live edit deactivated"),
});

// When the page is destroyed:
// handle.cleanup();`}
        language="typescript"
      />

      <DocsHeading>Supported field types</DocsHeading>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-semibold">Field type</th>
              <th className="pb-2 font-semibold">Inline update behavior</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4">text, textarea, url</td>
              <td className="py-2">
                Updates element&apos;s{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  textContent
                </code>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">number, boolean</td>
              <td className="py-2">
                Updates element&apos;s{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  textContent
                </code>{" "}
                (stringified)
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4">image</td>
              <td className="py-2">
                Updates{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  src
                </code>{" "}
                on{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  {"<img>"}
                </code>{" "}
                or{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  backgroundImage
                </code>{" "}
                on{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  {"<div>"}
                </code>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">shopifyProduct, shopifyCollection</td>
              <td className="py-2">
                Triggers a full preview refresh (complex data)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>Limitations</DocsHeading>
      <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
        <li>
          No inline WYSIWYG editing in the preview (fields are edited in the
          admin panel only)
        </li>
        <li>
          Shopify fields trigger a full refresh rather than inline updates
        </li>
        <li>No undo/redo &mdash; revert by not saving</li>
        <li>
          Developers must add{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            data-no-mess-field
          </code>{" "}
          attributes to their markup
        </li>
      </ul>

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">No highlights appear in the preview</p>
          <p className="text-sm text-muted-foreground">
            Make sure your markup includes{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              data-no-mess-field
            </code>{" "}
            attributes and that the live edit handler is initialized (via{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              useNoMessLiveEdit
            </code>{" "}
            or{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              createLiveEditHandler
            </code>
            ).
          </p>
        </div>
        <div>
          <p className="font-semibold">Fields not updating in real-time</p>
          <p className="text-sm text-muted-foreground">
            Check that the field names in your{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              data-no-mess-field
            </code>{" "}
            attributes exactly match the field names in your content type
            schema. The SDK performs exact string matching.
          </p>
        </div>
        <div>
          <p className="font-semibold">Overlays misaligned after scrolling</p>
          <p className="text-sm text-muted-foreground">
            The SDK tracks scroll and resize events to reposition overlays. If
            overlays still misalign, this may indicate custom scroll containers.
            The handler listens to window-level scroll &mdash; nested scroll
            containers may require additional configuration in a future release.
          </p>
        </div>
      </div>
    </div>
  );
}
