import type {
  ContentTypeDefinition,
  FieldDefinition,
  FragmentDefinition,
  NamedFieldDefinition,
  SchemaDefinition,
  TemplateDefinition,
} from "./schema-types.js";

/**
 * Generates a complete schema.ts source file from a SchemaDefinition.
 * Round-trip guarantee: parseSchemaSource(generateSchemaSource(s)) matches s.
 */
export function generateSchemaSource(schema: SchemaDefinition): string {
  const lines: string[] = [];
  const fallbackDefinitions = schema.contentTypes ?? [];
  const fragments =
    schema.fragments ??
    fallbackDefinitions.filter(
      (definition): definition is FragmentDefinition =>
        definition.kind === "fragment",
    );
  const templates =
    schema.templates ??
    fallbackDefinitions.filter(
      (definition): definition is TemplateDefinition =>
        definition.kind !== "fragment",
    );
  const definitions = [...fragments, ...templates];

  lines.push(
    'import { defineSchema, defineFragment, defineTemplate, field } from "@no-mess/client/schema";',
  );
  lines.push("");

  const varNames: string[] = [];

  for (const definition of definitions) {
    const varName = slugToVarName(definition.slug);
    varNames.push(varName);
    lines.push(`const ${varName} = ${generateDefinitionCall(definition)};`);
    lines.push("");
  }

  const templateVarNames = templates.map((template) => slugToVarName(template.slug));
  const fragmentVarNames = fragments.map((fragment) => slugToVarName(fragment.slug));

  if (fragmentVarNames.length > 0) {
    lines.push("export default defineSchema({");
    lines.push(`  templates: [${templateVarNames.join(", ")}],`);
    lines.push(`  fragments: [${fragmentVarNames.join(", ")}],`);
    lines.push("});");
  } else {
    lines.push(
      `export default defineSchema({ contentTypes: [${templateVarNames.join(", ")}] });`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Generates a single defineContentType() call as a string.
 */
export function generateContentTypeSource(ct: ContentTypeDefinition): string {
  const lines: string[] = [];
  const factoryName =
    ct.kind === "fragment" ? "defineFragment" : "defineTemplate";

  lines.push(
    `import { ${factoryName}, field } from "@no-mess/client/schema";`,
  );
  lines.push("");
  lines.push(
    `export const ${slugToVarName(ct.slug)} = ${generateDefinitionCall(ct)};`,
  );
  lines.push("");

  return lines.join("\n");
}

function generateDefinitionCall(ct: ContentTypeDefinition): string {
  const lines: string[] = [];
  const factoryName =
    ct.kind === "fragment" ? "defineFragment" : "defineTemplate";
  lines.push(`${factoryName}(${quote(ct.slug)}, {`);
  lines.push(`  name: ${quote(ct.name)},`);

  if (ct.description) {
    lines.push(`  description: ${quote(ct.description)},`);
  }

  if (ct.kind === "template") {
    lines.push(`  mode: ${quote(ct.mode)},`);
    if (ct.route) {
      lines.push(`  route: ${quote(ct.route)},`);
    }
  }

  lines.push("  fields: {");

  for (const field of ct.fields) {
    const generated = generateNamedField(field, 2).split("\n");
    for (const line of generated) {
      lines.push(line);
    }
  }

  lines.push("  },");
  lines.push("})");

  return lines.join("\n");
}

function generateNamedField(
  field: NamedFieldDefinition,
  indentLevel: number,
): string {
  const indent = "  ".repeat(indentLevel);
  return `${indent}${quoteProperty(field.name)}: ${generateFieldCall(field, indentLevel)},`;
}

function generateFieldCall(
  field: FieldDefinition,
  indentLevel: number,
): string {
  switch (field.type) {
    case "object":
      return generateObjectFieldCall(field, indentLevel);
    case "array":
      return generateArrayFieldCall(field, indentLevel);
    case "fragment":
      return generateFragmentFieldCall(field);
    default:
      return generatePrimitiveFieldCall(field);
  }
}

function generatePrimitiveFieldCall(field: FieldDefinition): string {
  if (
    field.type === "object" ||
    field.type === "array" ||
    field.type === "fragment"
  ) {
    return "";
  }

  const opts = getSharedFieldOptions(field);

  if (field.type === "select" && field.options?.choices) {
    if (field.options.choices.length === 0) {
      opts.push("choices: []");
    } else {
      const choiceEntries = field.options.choices.map(
        (choice) =>
          `{ label: ${quote(choice.label)}, value: ${quote(choice.value)} }`,
      );
      opts.push(`choices: [${choiceEntries.join(", ")}]`);
    }
  }

  if (opts.length === 0) {
    return `field.${field.type}()`;
  }

  return `field.${field.type}({ ${opts.join(", ")} })`;
}

function generateObjectFieldCall(
  field: Extract<FieldDefinition, { type: "object" }>,
  indentLevel: number,
): string {
  const indent = "  ".repeat(indentLevel);
  const innerIndent = "  ".repeat(indentLevel + 1);
  const lines = ["field.object({"];
  const sharedOptions = getSharedFieldOptions(field);

  for (const option of sharedOptions) {
    lines.push(`${innerIndent}${option},`);
  }

  lines.push(`${innerIndent}fields: {`);
  for (const child of field.fields) {
    lines.push(generateNamedField(child, indentLevel + 2));
  }
  lines.push(`${innerIndent}},`);
  lines.push(`${indent}})`);

  return lines.join("\n");
}

function generateArrayFieldCall(
  field: Extract<FieldDefinition, { type: "array" }>,
  indentLevel: number,
): string {
  const indent = "  ".repeat(indentLevel);
  const innerIndent = "  ".repeat(indentLevel + 1);
  const sharedOptions = getSharedFieldOptions(field);
  const lines = ["field.array({"];

  for (const option of sharedOptions) {
    lines.push(`${innerIndent}${option},`);
  }

  const itemSource = generateFieldCall(field.of, indentLevel + 1).replace(
    /\n/g,
    `\n${innerIndent}`,
  );
  lines.push(`${innerIndent}of: ${itemSource},`);

  if (field.minItems !== undefined) {
    lines.push(`${innerIndent}minItems: ${field.minItems},`);
  }
  if (field.maxItems !== undefined) {
    lines.push(`${innerIndent}maxItems: ${field.maxItems},`);
  }

  lines.push(`${indent}})`);
  return lines.join("\n");
}

function generateFragmentFieldCall(
  field: Extract<FieldDefinition, { type: "fragment" }>,
): string {
  const opts = getSharedFieldOptions(field);
  const args = [quote(field.fragment)];

  if (opts.length > 0) {
    args.push(`{ ${opts.join(", ")} }`);
  }

  return `field.fragment(${args.join(", ")})`;
}

function getSharedFieldOptions(field: FieldDefinition): string[] {
  const opts: string[] = [];

  if (field.required) {
    opts.push("required: true");
  }

  if (field.label) {
    opts.push(`label: ${quote(field.label)}`);
  }

  if (field.description) {
    opts.push(`description: ${quote(field.description)}`);
  }

  return opts;
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

function quoteProperty(property: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(property)
    ? property
    : quote(property);
}
