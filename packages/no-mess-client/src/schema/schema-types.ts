/**
 * Schema types that mirror convex/lib/validators.ts exactly enough for the
 * DSL, parser, serializer, dashboard, and API to share one recursive model.
 */

export type PrimitiveFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "datetime"
  | "url"
  | "image"
  | "gallery"
  | "select"
  | "shopifyProduct"
  | "shopifyCollection";

export type ContainerFieldType = "object" | "array" | "fragment";

export type FieldType = PrimitiveFieldType | ContainerFieldType;

export const PRIMITIVE_FIELD_TYPES: readonly PrimitiveFieldType[] = [
  "text",
  "textarea",
  "number",
  "boolean",
  "datetime",
  "url",
  "image",
  "gallery",
  "select",
  "shopifyProduct",
  "shopifyCollection",
] as const;

export const FIELD_TYPES: readonly FieldType[] = [
  ...PRIMITIVE_FIELD_TYPES,
  "object",
  "array",
  "fragment",
] as const;

export type TemplateMode = "singleton" | "collection";
export type SchemaKind = "template" | "fragment";

export interface SelectChoice {
  label: string;
  value: string;
}

export interface FieldOptions {
  choices?: SelectChoice[];
}

export interface BaseFieldDefinition {
  type: FieldType;
  required: boolean;
  label?: string;
  description?: string;
}

export interface PrimitiveFieldDefinition extends BaseFieldDefinition {
  type: PrimitiveFieldType;
  options?: FieldOptions;
}

export interface ObjectFieldDefinition extends BaseFieldDefinition {
  type: "object";
  fields: NamedFieldDefinition[];
}

export interface ArrayFieldDefinition extends BaseFieldDefinition {
  type: "array";
  of: FieldDefinition;
  minItems?: number;
  maxItems?: number;
}

export interface FragmentFieldDefinition extends BaseFieldDefinition {
  type: "fragment";
  fragment: string;
}

export type FieldDefinition =
  | PrimitiveFieldDefinition
  | ObjectFieldDefinition
  | ArrayFieldDefinition
  | FragmentFieldDefinition;

export type NamedFieldDefinition = FieldDefinition & { name: string };

export interface BaseSchemaDefinition {
  slug: string;
  name: string;
  description?: string;
  fields: NamedFieldDefinition[];
}

export interface TemplateDefinition extends BaseSchemaDefinition {
  kind: "template";
  mode: TemplateMode;
  route?: string;
}

export interface FragmentDefinition extends BaseSchemaDefinition {
  kind: "fragment";
}

export type ContentTypeDefinition = TemplateDefinition | FragmentDefinition;

export interface SchemaDefinition {
  templates?: TemplateDefinition[];
  fragments?: FragmentDefinition[];
  contentTypes: ContentTypeDefinition[];
}
