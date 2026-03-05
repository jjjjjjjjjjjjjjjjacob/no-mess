import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function CliPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          CLI &amp; Schema as Code
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Define content schemas in TypeScript and sync them with the dashboard
          using the no-mess CLI.
        </p>
      </div>

      <DocsHeading>Overview</DocsHeading>
      <p className="text-muted-foreground">
        no-mess supports two ways to manage schemas: the dashboard UI
        (drag-and-drop fields) and a code-first CLI. Both are two-way &mdash;
        you can push schemas from code to the dashboard, or pull from the
        dashboard into code. Use whichever fits your workflow.
      </p>

      <DocsHeading>Installation</DocsHeading>
      <p className="text-muted-foreground">
        Install the CLI globally or run it with{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">npx</code>:
      </p>
      <CodeBlock code="npm install -g no-mess" language="bash" />
      <p className="mt-2 text-sm text-muted-foreground">
        Or without installing:
      </p>
      <CodeBlock code="npx no-mess" language="bash" />

      <DocsHeading>Getting Started</DocsHeading>

      <DocsStep number={1} title="Initialize your project">
        <p>
          Run{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess init
          </code>{" "}
          in your project root. This creates a{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess.schema.ts
          </code>{" "}
          file and prompts for your API key.
        </p>
        <CodeBlock code="no-mess init" language="bash" />
      </DocsStep>

      <DocsStep number={2} title="Define your schema">
        <p>
          Edit{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess.schema.ts
          </code>{" "}
          using the TypeScript DSL:
        </p>
        <CodeBlock
          code={`import { defineSchema, defineContentType, field } from "@no-mess/client/schema";

const blogPost = defineContentType("blog-post", {
  name: "Blog Post",
  description: "Articles for the blog",
  fields: {
    title: field.text({ required: true }),
    body: field.textarea(),
    coverImage: field.image(),
    publishedAt: field.datetime(),
    featured: field.boolean(),
    status: field.select({
      required: true,
      choices: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    }),
  },
});

export default defineSchema({ contentTypes: [blogPost] });`}
          language="typescript"
          filename="no-mess.schema.ts"
        />
      </DocsStep>

      <DocsStep number={3} title="Push to the dashboard">
        <p>
          Run{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            no-mess push
          </code>{" "}
          to sync your schema to the dashboard. The CLI shows a diff preview
          before applying changes.
        </p>
        <CodeBlock code="no-mess push" language="bash" />
      </DocsStep>

      <DocsHeading>Commands Reference</DocsHeading>

      <DocsHeading as="h3">init</DocsHeading>
      <p className="text-muted-foreground">
        Scaffolds a new{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess.schema.ts
        </code>{" "}
        file and writes your API key to{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">.env</code>.
      </p>
      <CodeBlock code="no-mess init" language="bash" />

      <DocsHeading as="h3">push</DocsHeading>
      <p className="text-muted-foreground">
        Parses the local schema file and pushes content type definitions to the
        dashboard. Shows a diff preview and prompts for confirmation.
      </p>
      <CodeBlock
        code={`no-mess push                     # uses default no-mess.schema.ts
no-mess push --schema ./custom.ts  # specify a custom schema file`}
        language="bash"
      />

      <DocsHeading as="h3">pull</DocsHeading>
      <p className="text-muted-foreground">
        Fetches the current schema from the dashboard and writes it to your
        local schema file.
      </p>
      <CodeBlock
        code={`no-mess pull                     # overwrites no-mess.schema.ts
no-mess pull --stdout              # print to stdout instead of file`}
        language="bash"
      />

      <DocsHeading as="h3">dev</DocsHeading>
      <p className="text-muted-foreground">
        Watches your schema file for changes and automatically pushes on save.
        Useful during active development.
      </p>
      <CodeBlock code="no-mess dev" language="bash" />

      <DocsHeading>Watch Mode</DocsHeading>
      <p className="text-muted-foreground">
        Running{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess dev
        </code>{" "}
        starts a file watcher on your schema file. Every time you save, the CLI
        parses and pushes changes automatically. Parser errors are shown inline
        without crashing the watcher.
      </p>

      <DocsHeading>Pull from Dashboard</DocsHeading>
      <p className="text-muted-foreground">
        If you&apos;ve made changes in the dashboard UI and want to sync them
        back to code, use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess pull
        </code>
        . This generates a complete schema file from the dashboard&apos;s
        current state.
      </p>
      <DocsCallout type="tip">
        Use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess pull --stdout
        </code>{" "}
        to preview the output before overwriting your schema file.
      </DocsCallout>

      <DocsHeading>Dashboard Import/Export</DocsHeading>
      <p className="text-muted-foreground">
        The dashboard Schemas page also has Import and Export buttons. Export
        generates a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess.schema.ts
        </code>{" "}
        file you can save to your project. Import accepts a schema file and
        shows a diff preview before applying.
      </p>

      <DocsHeading>Field Types</DocsHeading>
      <p className="text-muted-foreground">
        All field builders are available on the{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">field</code>{" "}
        object:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 pr-4 font-medium">Builder</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 font-medium">Options</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.text()</td>
              <td className="py-2 pr-4">Single-line text</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.textarea()</td>
              <td className="py-2 pr-4">Multi-line text</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.number()</td>
              <td className="py-2 pr-4">Number</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.boolean()</td>
              <td className="py-2 pr-4">Boolean toggle</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.datetime()</td>
              <td className="py-2 pr-4">Date/time</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.url()</td>
              <td className="py-2 pr-4">URL</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.image()</td>
              <td className="py-2 pr-4">Image asset</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">field.select()</td>
              <td className="py-2 pr-4">Dropdown select</td>
              <td className="py-2">required, description, choices</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">
                field.shopifyProduct()
              </td>
              <td className="py-2 pr-4">Shopify product</td>
              <td className="py-2">required, description</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-mono text-xs">
                field.shopifyCollection()
              </td>
              <td className="py-2 pr-4">Shopify collection</td>
              <td className="py-2">required, description</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsHeading>Environment Variables</DocsHeading>
      <p className="text-muted-foreground">
        The CLI reads the following environment variables from{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">.env</code>:
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NO_MESS_API_KEY
          </code>{" "}
          &mdash; your site&apos;s secret API key (
          <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>{" "}
          prefix)
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NO_MESS_API_URL
          </code>{" "}
          &mdash; API base URL (defaults to production, override for local
          development)
        </li>
      </ul>

      <DocsCallout type="info">
        Running{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          no-mess init
        </code>{" "}
        will prompt for your API key and add it to your{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">.env</code>{" "}
        file automatically.
      </DocsCallout>
    </div>
  );
}
