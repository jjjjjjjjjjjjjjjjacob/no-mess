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
      "An asset picker that selects from your media library. Stores the image URL with dimensions.",
    storedValue: "string (URL)",
    options: ["required"],
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
];

export default function FieldTypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Field Types</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Reference for all 9 content field types available in no-mess.
        </p>
      </div>

      <DocsHeading>Overview</DocsHeading>
      <p className="text-muted-foreground">
        When defining a content type schema, you add fields with specific types.
        Each field type determines the input UI in the editor and the data
        format returned by the API. All field types support a{" "}
        <strong>required</strong> option.
      </p>

      <DocsHeading>All Field Types</DocsHeading>
      <div className="space-y-4">
        {fieldTypes.map((ft) => (
          <FieldTypeCard key={ft.type} {...ft} />
        ))}
      </div>

      <DocsHeading>API Response Format</DocsHeading>
      <p className="text-muted-foreground">
        When you fetch entries via the SDK, each field value is returned as the
        stored type listed above. The entry object also includes metadata:
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
        alongside the metadata fields. Use TypeScript generics with the SDK to
        get type-safe access to your custom fields.
      </DocsCallout>
    </div>
  );
}
