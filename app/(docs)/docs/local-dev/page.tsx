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
          Set up no-mess for local development with preview mode, environment
          variables, and Shopify integration.
        </p>
      </div>

      <DocsHeading>Prerequisites</DocsHeading>
      <p className="text-muted-foreground">
        This guide assumes you have already completed the{" "}
        <a
          href="/docs/getting-started"
          className="font-medium text-primary underline"
        >
          Getting Started
        </a>{" "}
        guide: you have a no-mess account, a site created, and the{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          @no-mess/client
        </code>{" "}
        SDK installed in your project.
      </p>

      <DocsHeading>Environment Variables</DocsHeading>
      <p className="text-muted-foreground">
        Create a{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          .env.local
        </code>{" "}
        file in the root of your project with the following variables:
      </p>
      <CodeBlock
        code={`# Required — your site's API key (found in site Settings)
NO_MESS_API_KEY=nm_your_api_key
NEXT_PUBLIC_NO_MESS_API_KEY=nm_your_api_key

# Optional — point the SDK directly at your Convex deployment
# instead of going through the API gateway (https://api.nomess.xyz).
# Useful when developing locally against a Convex dev deployment.
# NO_MESS_API_URL=https://your-convex-deployment.convex.site
# NEXT_PUBLIC_NO_MESS_API_URL=https://your-convex-deployment.convex.site`}
        language="bash"
        filename=".env.local"
      />
      <DocsCallout type="info" title="When do I need apiUrl?">
        <p>
          By default the SDK routes all requests through the no-mess API gateway
          at{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            https://api.nomess.xyz
          </code>
          . If you are running a local Convex dev deployment and want to bypass
          the gateway, set{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NO_MESS_API_URL
          </code>{" "}
          to your Convex HTTP actions URL. For production, you can omit it
          entirely.
        </p>
      </DocsCallout>

      <DocsCallout type="warning" title="NEXT_PUBLIC_ prefix">
        <p>
          The{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            NEXT_PUBLIC_
          </code>{" "}
          variants are only needed for client-side code (e.g., the preview
          route). Server-side code (server components, API routes) should use
          the unprefixed versions. Never expose your API key in client bundles
          beyond what is needed for preview.
        </p>
      </DocsCallout>

      <DocsHeading>SDK Client Setup</DocsHeading>
      <p className="text-muted-foreground">
        Create a shared client instance. The{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">apiUrl</code>{" "}
        option is only needed if you set{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          NO_MESS_API_URL
        </code>{" "}
        above.
      </p>
      <CodeBlock
        code={`import { createNoMessClient } from "@no-mess/client";

export const cms = createNoMessClient({
  apiKey: process.env.NO_MESS_API_KEY!,
  // apiUrl: process.env.NO_MESS_API_URL,
});`}
        language="typescript"
        filename="lib/cms.ts"
      />

      <DocsHeading>Preview Mode for Local Development</DocsHeading>

      <DocsHeading as="h3">How Preview Works</DocsHeading>
      <p className="text-muted-foreground">
        When you click <strong>Preview</strong> in the no-mess dashboard, the
        dashboard opens your site in an iframe and sends draft content via{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          postMessage
        </code>
        . The SDK listens for these messages and renders the draft entry. For
        this to work, three things need to line up:
      </p>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
        <li>
          Your site&apos;s <strong>preview URL</strong> in site settings must
          point to your running dev server
        </li>
        <li>
          The{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            adminOrigin
          </code>{" "}
          option on{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            useNoMessPreview
          </code>{" "}
          must match the origin of the dashboard sending the message
        </li>
        <li>
          Your CSP headers must allow the dashboard to embed your site in an
          iframe
        </li>
      </ol>

      <DocsStep number={1} title="Set preview URL to localhost">
        <p>
          Go to your site&apos;s <strong>Settings</strong> page in the no-mess
          dashboard and set the preview URL to your local dev server, e.g.:
        </p>
        <CodeBlock code="http://localhost:3001" language="bash" />
        <p className="mt-2">
          This tells the dashboard where to load the preview iframe. Use
          whatever port your client site runs on.
        </p>
      </DocsStep>

      <DocsStep number={2} title="Add a preview route">
        <p>
          Create a{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /no-mess-preview
          </code>{" "}
          route in your site. When developing locally against a local dashboard
          (e.g., on{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            localhost:3000
          </code>
          ), pass{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            adminOrigin
          </code>{" "}
          to tell the SDK which origin to trust for postMessage events:
        </p>
        <CodeBlock
          code={`"use client";

import { useNoMessPreview } from "@no-mess/client/react";

export default function PreviewPage() {
  const { entry, error, isLoading } = useNoMessPreview({
    apiKey: process.env.NEXT_PUBLIC_NO_MESS_API_KEY!,
    // Point to Convex directly if bypassing the gateway
    // apiUrl: process.env.NEXT_PUBLIC_NO_MESS_API_URL,
    // Trust your local dashboard origin for postMessage
    adminOrigin: "http://localhost:3000",
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
        <p className="mt-2">
          In production, you can remove{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            adminOrigin
          </code>{" "}
          &mdash; it defaults to{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            https://admin.no-mess.xyz
          </code>
          .
        </p>
      </DocsStep>

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
                Required. Your site&apos;s API key (use the{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  NEXT_PUBLIC_
                </code>{" "}
                variant).
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
                Override the API endpoint. Set this to your Convex HTTP actions
                URL if bypassing the gateway during development.
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
                The origin of the no-mess dashboard. Used to validate incoming
                postMessage events. Set to{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">
                  http://localhost:3000
                </code>{" "}
                when developing against a local dashboard.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocsStep number={3} title="Configure CSP headers">
        <p>
          Your preview route must allow the no-mess dashboard to embed it in an
          iframe. Add a{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            Content-Security-Policy
          </code>{" "}
          header with{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            frame-ancestors
          </code>
          . In local development, you need to allow your local dashboard origin:
        </p>
        <CodeBlock
          code={`// next.config.ts
const nextConfig = {
  async headers() {
    const cspOrigin =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://admin.no-mess.xyz";

    return [{
      source: "/no-mess-preview",
      headers: [{
        key: "Content-Security-Policy",
        value: \`frame-ancestors 'self' \${cspOrigin}\`,
      }],
    }];
  },
};

export default nextConfig;`}
          language="typescript"
          filename="next.config.ts"
        />
        <p className="mt-2">
          This allows the dashboard to embed your preview route in development
          and production without hardcoding both origins.
        </p>
      </DocsStep>

      <DocsHeading>Headless Shopify Storefront Example</DocsHeading>
      <p className="text-muted-foreground">
        A common pattern is combining CMS content with Shopify product data on
        the same page. Here&apos;s a complete Next.js product page that fetches
        a CMS entry for editorial content and the Shopify product for pricing
        and availability:
      </p>
      <CodeBlock
        code={`import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import { NoMessError } from "@no-mess/client";
import type { ShopifyProduct } from "@no-mess/client";

interface ProductPage {
  slug: string;
  title: string;
  description: string;
  shopifyHandle: string;
  featuredImage: string;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // Fetch CMS content and Shopify product in parallel
    const entry = await cms.getEntry<ProductPage>("products", slug);
    const product: ShopifyProduct = await cms.getProduct(
      entry.shopifyHandle,
    );

    return (
      <main>
        <h1>{entry.title}</h1>
        <p>{entry.description}</p>
        <img src={entry.featuredImage} alt={entry.title} />

        <div>
          <p>
            {product.priceRange.min === product.priceRange.max
              ? \`$\${product.priceRange.min}\`
              : \`$\${product.priceRange.min} – $\${product.priceRange.max}\`}
          </p>
          <p>{product.available ? "In stock" : "Sold out"}</p>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof NoMessError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}`}
        language="tsx"
        filename="app/products/[slug]/page.tsx"
      />

      <DocsCallout type="tip" title="Shopify Setup">
        <p>
          Make sure you&apos;ve connected your Shopify store and synced products
          first. See the{" "}
          <a
            href="/docs/shopify"
            className="font-medium text-primary underline"
          >
            Shopify Integration
          </a>{" "}
          guide for setup instructions.
        </p>
      </DocsCallout>

      <DocsHeading>Troubleshooting</DocsHeading>
      <div className="space-y-4">
        <div>
          <p className="font-semibold">Preview iframe is blank</p>
          <p className="text-sm text-muted-foreground">
            Check that your{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              Content-Security-Policy
            </code>{" "}
            header allows the dashboard origin. In development, this should
            include{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              http://localhost:3000
            </code>{" "}
            (or wherever your local dashboard is running). Open your
            browser&apos;s developer tools and check the console for CSP
            violation errors.
          </p>
        </div>

        <div>
          <p className="font-semibold">Loading spinner stuck</p>
          <p className="text-sm text-muted-foreground">
            The preview handshake may be failing. Verify that the{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              adminOrigin
            </code>{" "}
            in{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              useNoMessPreview
            </code>{" "}
            matches the exact origin of the dashboard (including protocol and
            port). For example,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              http://localhost:3000
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              http://127.0.0.1:3000
            </code>{" "}
            are different origins.
          </p>
        </div>

        <div>
          <p className="font-semibold">401 Unauthorized errors</p>
          <p className="text-sm text-muted-foreground">
            Double-check that your{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              NEXT_PUBLIC_NO_MESS_API_KEY
            </code>{" "}
            (for the preview route) and{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              NO_MESS_API_KEY
            </code>{" "}
            (for server-side fetches) are set correctly in{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              .env.local
            </code>
            . Make sure the key starts with{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">nm_</code>
            . If you set{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              apiUrl
            </code>
            , verify it points to a valid Convex HTTP actions endpoint.
          </p>
        </div>

        <div>
          <p className="font-semibold">Port conflicts</p>
          <p className="text-sm text-muted-foreground">
            If port 3000 is already in use by the no-mess dashboard, start your
            client site on a different port (e.g.,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              next dev -p 3001
            </code>
            ) and update the preview URL in site settings to match (
            <code className="rounded bg-muted px-1 font-mono text-xs">
              http://localhost:3001
            </code>
            ).
          </p>
        </div>
      </div>
    </div>
  );
}
