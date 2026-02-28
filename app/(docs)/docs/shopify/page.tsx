import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { DocsStep } from "@/components/docs/docs-step";

export default function ShopifyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Shopify Integration
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Sync your Shopify products and collections into no-mess.
        </p>
      </div>

      <DocsHeading>Overview</DocsHeading>
      <p className="text-muted-foreground">
        no-mess integrates with Shopify via the Admin REST API. You create a
        Custom App in Shopify, paste the access token into no-mess, and sync
        your products and collections. Once synced, you can reference products
        in your content using the{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">
          shopifyProduct
        </code>{" "}
        field type and fetch them via the SDK.
      </p>

      <DocsCallout type="info">
        no-mess uses a token-based connection (not OAuth). You paste your
        Shopify Admin API token directly. This avoids the complexity of building
        a Shopify app but means each site owner manages their own token.
      </DocsCallout>

      <DocsHeading>Setup</DocsHeading>

      <DocsStep number={1} title="Create a Custom App in Shopify">
        <ol className="list-inside list-decimal space-y-2">
          <li>
            Go to your Shopify Admin &rarr; <strong>Settings</strong> &rarr;{" "}
            <strong>Apps and sales channels</strong> &rarr;{" "}
            <strong>Develop apps</strong>
          </li>
          <li>
            Click <strong>Create an app</strong> and give it a name (e.g.,
            &quot;no-mess CMS&quot;)
          </li>
          <li>
            Under <strong>Admin API scopes</strong>, enable{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              read_products
            </code>
          </li>
          <li>
            Click <strong>Install app</strong>
          </li>
          <li>
            Copy the <strong>Admin API access token</strong> (starts with{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              shpat_
            </code>
            )
          </li>
        </ol>
      </DocsStep>

      <DocsStep number={2} title="Configure in no-mess">
        <ol className="list-inside list-decimal space-y-2">
          <li>
            Navigate to your site&apos;s <strong>Shopify</strong> tab
          </li>
          <li>
            Enter your Shopify store domain (e.g.,{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              my-store.myshopify.com
            </code>
            )
          </li>
          <li>Paste the Admin API access token</li>
          <li>
            Click <strong>Connect</strong>
          </li>
        </ol>
      </DocsStep>

      <DocsStep number={3} title="Sync products">
        <p>
          After connecting, click <strong>Sync Now</strong> to pull all products
          and collections from your Shopify store. Syncing fetches up to 250
          products per page with automatic pagination and rate limit handling.
        </p>
      </DocsStep>

      <DocsHeading>Using the Shopify Product Field</DocsHeading>
      <p className="text-muted-foreground">
        When defining a content type, add a field with type{" "}
        <strong>Shopify Product</strong>. This renders a product picker in the
        editor that shows your synced products. The field stores the product
        handle as a string.
      </p>

      <DocsHeading>Fetching Products via SDK</DocsHeading>
      <CodeBlock
        code={`import { createNoMessClient } from "@no-mess/client";
import type { ShopifyProduct, ShopifyCollection } from "@no-mess/client";

const cms = createNoMessClient({
  apiKey: process.env.NO_MESS_SECRET_KEY!,
  // apiUrl: process.env.NO_MESS_API_URL,
});

// Get all synced products
const products: ShopifyProduct[] = await cms.getProducts();

// Get a single product by handle
const product: ShopifyProduct = await cms.getProduct("classic-tee");

// Get all collections
const collections: ShopifyCollection[] = await cms.getCollections();

// Get a single collection by handle
const collection: ShopifyCollection = await cms.getCollection("summer-sale");`}
        language="typescript"
      />

      <DocsHeading>Product Data Shape</DocsHeading>
      <p className="text-muted-foreground">
        Synced products include the following fields:
      </p>
      <CodeBlock
        code={`interface ShopifyProduct {
  handle: string;
  title: string;
  status: string;
  featuredImage?: string;
  priceRange: { min: string; max: string };
  available: boolean;
  images?: { id: string; src: string; alt?: string }[];
  variants?: {
    id: string;
    title: string;
    sku?: string;
    price: string;
    compareAtPrice?: string;
    available: boolean;
  }[];
  productType?: string;
  vendor?: string;
  tags?: string[];
}

interface ShopifyCollection {
  handle: string;
  title: string;
  image?: string;
  productsCount: number;
}`}
        language="typescript"
      />

      <DocsCallout type="warning">
        Product data is denormalized at sync time. If you update products in
        Shopify, you need to re-sync to see the changes in no-mess.
      </DocsCallout>

      <DocsCallout type="tip" title="Headless Shopify Storefront">
        <p>
          Building a headless Shopify storefront with a local Next.js dev
          server? See the{" "}
          <a
            href="/docs/local-dev"
            className="font-medium text-primary underline"
          >
            Local Development
          </a>{" "}
          guide for environment setup, preview configuration, and a complete
          product page example combining CMS content with Shopify data.
        </p>
      </DocsCallout>
    </div>
  );
}
