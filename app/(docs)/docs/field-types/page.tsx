import { CodeBlock } from "@/components/docs/code-block";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsHeading } from "@/components/docs/docs-heading";
import { FieldTypeCard } from "@/components/docs/field-type-card";

const fieldTypes = [
  {
    name: "Text",
    type: "text",
    description:
      "A single-line text input. Use for titles, names, short strings.",
    storedValue: "string",
  },
  {
    name: "Textarea",
    type: "textarea",
    description:
      "A multi-line text input. Use for body content, descriptions, long-form text.",
    storedValue: "string",
  },
  {
    name: "Number",
    type: "number",
    description: "A numeric input. Use for prices, quantities, sort orders.",
    storedValue: "number",
  },
  {
    name: "Boolean",
    type: "boolean",
    description:
      "A toggle switch. Use for flags like featured, published, or active.",
    storedValue: "boolean",
  },
  {
    name: "Date/Time",
    type: "datetime",
    description:
      "A date and time picker. Use for publish dates, event times, deadlines.",
    storedValue: "string (ISO 8601)",
  },
  {
    name: "URL",
    type: "url",
    description:
      "A URL input with validation. Use for external links, canonical URLs.",
    storedValue: "string",
  },
  {
    name: "Image",
    type: "image",
    description:
      "A single image asset picker backed by your media library. Stores an asset internally and returns its delivery URL in API responses.",
    storedValue: "string (asset URL in API responses)",
    options: ["required"],
  },
  {
    name: "Gallery",
    type: "gallery",
    description:
      "An ordered list of image and video assets from your media library. Stores assets internally and returns delivery URLs in API responses.",
    storedValue: "string[] (asset URLs in API responses)",
    options: ["required"],
  },
  {
    name: "Object Group",
    type: "object",
    description:
      "A named nested object. Use it to group related child fields like hero settings, SEO metadata, or CTA blocks.",
    storedValue: "object",
    options: ["required", "nested fields"],
  },
  {
    name: "Repeater Array",
    type: "array",
    description:
      "A repeatable list of nested items. Use it for slides, FAQs, feature lists, or other ordered groups.",
    storedValue: "array",
    options: ["required", "nested item schema", "min/max items"],
  },
  {
    name: "Fragment Reference",
    type: "fragment",
    description:
      "A reusable reference to a fragment schema. Use it when the same nested structure appears in multiple templates.",
    storedValue: "object (resolved fragment fields)",
    options: ["required", "fragment target"],
  },
  {
    name: "Select",
    type: "select",
    description:
      "A dropdown menu with predefined choices. Define your options when creating the field.",
    storedValue: "string",
    options: ["required", "choices (label + value pairs)"],
  },
  {
    name: "Shopify Product",
    type: "shopifyProduct",
    description:
      "A product picker that selects from synced Shopify products. Requires Shopify integration to be configured.",
    storedValue: "string (product handle)",
  },
  {
    name: "Shopify Collection",
    type: "shopifyCollection",
    description:
      "A collection picker that selects from synced Shopify collections. Requires Shopify integration to be configured.",
    storedValue: "string (collection handle)",
  },
];

export default function FieldTypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Field Types</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Reference for the primitive and recursive field types available in
          no-mess.
        </p>
      </div>

      <DocsHeading>Overview</DocsHeading>
      <p className="text-muted-foreground">
        Templates and fragments are built from fields. Some fields store a
        single primitive value, and others describe nested structures such as
        objects, repeaters, and fragment references. Each field type determines
        the editing UI and the shape returned by the SDK and API.
      </p>

      <DocsHeading>Templates and Fragments</DocsHeading>
      <p className="text-muted-foreground">
        Use <strong>templates</strong> for real authoring surfaces. Templates
        can be <strong>singleton</strong> route-bound pages such as{" "}
        <code className="rounded bg-muted px-1 font-mono text-xs">/</code> or
        repeatable <strong>collection</strong> content like blog posts. Use{" "}
        <strong>fragments</strong> for reusable nested field groups that should
        not create standalone entries.
      </p>

      <DocsHeading>All Field Types</DocsHeading>
      <div className="space-y-4">
        {fieldTypes.map((ft) => (
          <FieldTypeCard key={ft.type} {...ft} />
        ))}
      </div>

      <DocsHeading>Common Patterns</DocsHeading>
      <p className="text-muted-foreground">
        Recursive fields let you model real content shapes instead of flattening
        everything into numbered keys.
      </p>
      <CodeBlock
        code={`import { defineFragment, defineTemplate, field } from "@no-mess/client/schema";

const imageWithAlt = defineFragment("image-with-alt", {
  name: "Image With Alt",
  fields: {
    image: field.image({ required: true }),
    alt: field.text(),
  },
});

const homePage = defineTemplate("home-page", {
  name: "Home Page",
  mode: "singleton",
  route: "/",
  fields: {
    hero: field.object({
      fields: {
        slides: field.array({
          of: field.fragment(imageWithAlt),
          minItems: 1,
        }),
      },
    }),
    gallery: field.gallery(),
  },
});`}
        filename="schema-patterns.ts"
        language="typescript"
      />

      <DocsHeading>API Response Format</DocsHeading>
      <p className="text-muted-foreground">
        When you fetch entries via the SDK, image-backed fields are returned as
        delivery URLs, nested objects stay nested, arrays stay ordered, and
        fragment references resolve inline to their child fields. The entry
        object also includes metadata:
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">slug</code>{" "}
          &mdash; URL-friendly identifier
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">title</code>{" "}
          &mdash; entry title
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">_id</code>{" "}
          &mdash; unique entry ID
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">
            _createdAt
          </code>{" "}
          &mdash; creation timestamp (ms)
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">
            _updatedAt
          </code>{" "}
          &mdash; last update timestamp (ms)
        </li>
        <li>
          <code className="rounded bg-muted px-1 font-mono text-xs">
            _publishedAt
          </code>{" "}
          &mdash; publish timestamp (ms, optional)
        </li>
      </ul>

      <DocsCallout type="info">
        Custom field values are returned at the top level of the entry object,
        alongside the metadata fields, and nested containers preserve their
        authored shape. Use TypeScript generics with the SDK to get type-safe
        access to your custom fields.
      </DocsCallout>
    </div>
  );
}
