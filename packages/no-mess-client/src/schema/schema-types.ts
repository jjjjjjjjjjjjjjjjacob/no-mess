/**
 * Schema types that mirror convex/lib/validators.ts Field/FieldType exactly.
 * This is the shared type contract between DSL, parser, serializer, and API.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "datetime"
  | "url"
  | "image"
  | "select"
  | "shopifyProduct"
  | "shopifyCollection";

export const FIELD_TYPES: readonly FieldType[] = [
  "text",
  "textarea",
  "number",
  "boolean",
  "datetime",
  "url",
  "image",
  "select",
  "shopifyProduct",
  "shopifyCollection",
] as const;

export interface FieldDefinition {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  options?: {
    choices?: { label: string; value: string }[];
  };
}

export interface ContentTypeDefinition {
  slug: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
}

export interface SchemaDefinition {
  contentTypes: ContentTypeDefinition[];
}
