import type { Field } from "./validators";

/**
 * Maps a field definition to its TypeScript type string.
 */
function fieldToTsType(field: Field): string {
  switch (field.type) {
    case "text":
    case "textarea":
    case "url":
    case "image":
    case "datetime":
      return "string";
    case "gallery":
      return "string[]";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "select": {
      const choices = field.options?.choices;
      if (choices && choices.length > 0) {
        return choices.map((c) => JSON.stringify(c.value)).join(" | ");
      }
      return "string";
    }
    case "shopifyProduct":
      return "{ handle: string; title: string; shopifyId: string }";
    case "shopifyCollection":
      return "{ handle: string; title: string; shopifyId: string }";
    default:
      return "unknown";
  }
}

export interface FieldTypeMapEntry {
  name: string;
  type: string;
  tsType: string;
  required: boolean;
}

/**
 * Generates a field type map from an array of field definitions.
 * Each entry includes the field name, storage type, TypeScript type, and required flag.
 */
export function generateFieldTypeMap(fields: Field[]): FieldTypeMapEntry[] {
  return fields.map((field) => ({
    name: field.name,
    type: field.type,
    tsType: fieldToTsType(field),
    required: field.required,
  }));
}

/**
 * Generates a TypeScript interface string from a content type name and its fields.
 * The interface extends NoMessEntry (slug, title, _id, timestamps).
 */
export function generateTypeScriptInterface(
  name: string,
  fields: Field[],
): string {
  const interfaceName = name
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  const fieldLines = fields.map((field) => {
    const tsType = fieldToTsType(field);
    const optional = field.required ? "" : "?";
    return `  ${field.name}${optional}: ${tsType};`;
  });

  return [
    `interface ${interfaceName} extends NoMessEntry {`,
    ...fieldLines,
    "}",
  ].join("\n");
}
