import { v } from "convex/values";

/**
 * Validator for field types in content type schemas.
 */
export const fieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("datetime"),
  v.literal("url"),
  v.literal("image"),
  v.literal("select"),
  v.literal("shopifyProduct"),
  v.literal("shopifyCollection"),
);

/**
 * Validator for a single field definition in a content type.
 */
export const fieldValidator = v.object({
  name: v.string(),
  type: fieldTypeValidator,
  required: v.boolean(),
  description: v.optional(v.string()),
  options: v.optional(
    v.object({
      choices: v.optional(
        v.array(
          v.object({
            label: v.string(),
            value: v.string(),
          }),
        ),
      ),
    }),
  ),
});

/**
 * Validator for an array of field definitions.
 */
export const contentFieldsValidator = v.array(fieldValidator);

/**
 * All valid field type strings for use in runtime checks.
 */
export const FIELD_TYPES = [
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

export type FieldType = (typeof FIELD_TYPES)[number];

export type Field = {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  options?: {
    choices?: { label: string; value: string }[];
  };
};
