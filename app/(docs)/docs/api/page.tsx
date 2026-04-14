import { CodeBlock } from "@/components/docs/code-block";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function ApiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Read published content, exchange working-draft preview sessions, and
          report page URLs for route-aware Live Edit.
        </p>
      </div>

      <DocsHeading>Authentication</DocsHeading>
      <p className="text-muted-foreground">
        Use{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          Authorization: Bearer ...
        </code>{" "}
        with either a secret key (
        <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>) or
        a publishable key (
        <code className="rounded bg-muted px-1 font-mono text-xs">nm_pub_</code>
        ) where allowed.
      </p>

      <DocsHeading>Published Content</DocsHeading>
      <CodeBlock
        code={`GET /api/content/{contentType}
GET /api/content/{contentType}/{slug}`}
        language="http"
      />
      <p className="text-muted-foreground">
        These responses are cached. Use a publishable key for browser-safe
        reads.
      </p>
      <p className="text-muted-foreground">
        Add{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          fresh=true
        </code>{" "}
        when a deployed route needs request-time content and immediate publish
        visibility:
      </p>
      <CodeBlock
        code={`GET /api/content/{contentType}?fresh=true
GET /api/content/{contentType}/{slug}?fresh=true`}
        language="http"
      />
      <p className="text-muted-foreground">
        Preview reads (
        <code className="rounded bg-muted px-1 font-mono text-xs">
          preview=true
        </code>
        ) and fresh reads both return{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          Cache-Control: no-store, no-cache, must-revalidate
        </code>
        .
      </p>

      <DocsHeading>Preview Session Exchange</DocsHeading>
      <CodeBlock
        code={`POST /api/preview/exchange
Content-Type: application/json

{
  "sessionId": "sess_123",
  "timestamp": "1736467200",
  "proof": "base64_hmac_proof"
}`}
        language="http"
      />
      <p className="text-muted-foreground">
        This endpoint is uncached and returns the current working draft for the
        active iframe session after HMAC verification.
      </p>

      <DocsHeading>Page URL Report Endpoint</DocsHeading>
      <DocsStep number={1} title="Request">
        <CodeBlock
          code={`POST /api/live-edit/routes/report
Authorization: Bearer nm_pub_your_publishable_key
Content-Type: application/json

{
  "entryId": "entry_123",
  "url": "https://mysite.com/blog/hello-world"
}`}
          language="http"
        />
      </DocsStep>

      <DocsStep number={2} title="Behavior">
        <div className="space-y-3 text-muted-foreground">
          <p>
            Accepts either a publishable or secret key, but is designed for
            browser-side route reporting.
          </p>
          <p>
            Normalizes the URL against the site preview and Live Edit base URL
            and strips transient preview parameters such as{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">sid</code>
            ,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              preview
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              secret
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              slug
            </code>
            , and{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              type
            </code>
            .
          </p>
          <p>
            The site preview and Live Edit base URL determine which origins and
            path prefixes are valid.
          </p>
          <p>
            Only writes again when a route is new or the last seen timestamp is
            older than 24 hours. This endpoint is intentionally uncached even
            though content reads are cached.
          </p>
        </div>
      </DocsStep>

      <DocsStep number={3} title="Response">
        <CodeBlock
          code={`HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store, no-cache, must-revalidate

{
  "ok": true
}`}
          language="http"
        />
      </DocsStep>

      <DocsHeading>Validation Rules</DocsHeading>
      <div className="space-y-3 text-muted-foreground">
        <p>
          Page URLs must match the preview and Live Edit base URL origin and
          stay within its path prefix.
        </p>
        <p>
          The request origin or referer must also match the reported route
          origin.
        </p>
        <p>
          Reporting a route for an entry outside the authenticated site is
          rejected.
        </p>
      </div>

      <DocsHeading>Related Guides</DocsHeading>
      <p className="text-sm text-muted-foreground">
        See{" "}
        <a href="/docs/preview" className="font-medium text-primary underline">
          Preview Mode
        </a>{" "}
        for iframe flow details and{" "}
        <a
          href="/docs/live-edit"
          className="font-medium text-primary underline"
        >
          Live Edit
        </a>{" "}
        for route-aware editing behavior.
      </p>
    </div>
  );
}
