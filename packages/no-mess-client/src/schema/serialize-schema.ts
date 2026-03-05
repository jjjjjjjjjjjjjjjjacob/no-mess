import type {
  ContentTypeDefinition,
  FieldDefinition,
  SchemaDefinition,
} from "./schema-types";

/**
 * Generates a complete schema.ts source file from a SchemaDefinition.
 * Round-trip guarantee: parseSchemaSource(generateSchemaSource(s)) matches s.
 */
export function generateSchemaSource(schema: SchemaDefinition): string {
  const lines: string[] = [];

  lines.push(
    'import { defineSchema, defineContentType, field } from "@no-mess/client/schema";',
  );
  lines.push("");

  const varNames: string[] = [];

  for (const ct of schema.contentTypes) {
    const varName = slugToVarName(ct.slug);
    varNames.push(varName);
    lines.push(`const ${varName} = ${generateContentTypeCall(ct)};`);
    lines.push("");
  }

  lines.push(
    `export default defineSchema({ contentTypes: [${varNames.join(", ")}] });`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates a single defineContentType() call as a string.
 */
export function generateContentTypeSource(ct: ContentTypeDefinition): string {
  const lines: string[] = [];

  lines.push(
    'import { defineContentType, field } from "@no-mess/client/schema";',
  );
  lines.push("");
  lines.push(
    `export const ${slugToVarName(ct.slug)} = ${generateContentTypeCall(ct)};`,
  );
  lines.push("");

  return lines.join("\n");
}

function generateContentTypeCall(ct: ContentTypeDefinition): string {
  const lines: string[] = [];
  lines.push(`defineContentType(${quote(ct.slug)}, {`);
  lines.push(`  name: ${quote(ct.name)},`);

  if (ct.description) {
    lines.push(`  description: ${quote(ct.description)},`);
  }

  lines.push("  fields: {");

  for (const field of ct.fields) {
    lines.push(`    ${field.name}: ${generateFieldCall(field)},`);
  }

  lines.push("  },");
  lines.push("})");

  return lines.join("\n");
}

function generateFieldCall(f: FieldDefinition): string {
  const opts: string[] = [];

  if (f.required) {
    opts.push("required: true");
  }

  if (f.description) {
    opts.push(`description: ${quote(f.description)}`);
  }

  if (f.type === "select" && f.options?.choices) {
    if (f.options.choices.length === 0) {
      opts.push("choices: []");
    } else {
      const choiceEntries = f.options.choices.map(
        (c) => `{ label: ${quote(c.label)}, value: ${quote(c.value)} }`,
      );
      opts.push(`choices: [\n        ${choiceEntries.join(",\n        ")},\n      ]`);
    }
  }

  if (opts.length === 0) {
    return `field.${f.type}()`;
  }

  return `field.${f.type}({ ${opts.join(", ")} })`;
}

/**
 * Convert a slug like "blog-post" to a camelCase variable name "blogPost".
 */
function slugToVarName(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Quote a string with double quotes, escaping special characters.
 */
function quote(s: string): string {
  const escaped = s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}
