import { buildFragmentMap, resolveFragmentDefinition } from "./tree-utils.js";
import type {
  ContentTypeDefinition,
  FieldDefinition,
  FragmentDefinition,
  NamedFieldDefinition,
} from "./schema-types.js";

export interface GeneratedDefinitionContract {
  definition: ContentTypeDefinition;
  interfaceName: string;
  interfaceSource: string;
  fieldMapConstName: string;
  fieldPathTypeName: string;
  fieldPathMap: Record<string, string>;
  slugConstName?: string;
  routeConstName?: string;
}

export function slugToPascalCase(slug: string): string {
  const tokens = toTokens(slug);
  const name = tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join("");
  return ensureTypeIdentifier(name || "Generated");
}

export function slugToScreamingSnakeCase(slug: string): string {
  const tokens = toTokens(slug);
  return ensureConstIdentifier(tokens.join("_").toUpperCase() || "GENERATED");
}

export function fieldPathToCamelCase(path: string): string {
  const tokens = toTokens(path.replace(/\[\]/g, ".item"));
  if (tokens.length === 0) {
    return "field";
  }

  const [first, ...rest] = tokens;
  const camel =
    first +
    rest
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join("");

  return /^[A-Za-z_$]/.test(camel) ? camel : `field${camel}`;
}

export function generateDefinitionContracts(
  definitions: ContentTypeDefinition[],
): GeneratedDefinitionContract[] {
  const fragments = buildFragmentMap(definitions);
  const seenBases = new Map<string, string>();

  return definitions.map((definition) => {
    const baseName = slugToPascalCase(definition.slug);
    const existingSlug = seenBases.get(baseName);
    if (existingSlug && existingSlug !== definition.slug) {
      throw new Error(
        `Codegen name collision: "${definition.slug}" and "${existingSlug}" both normalize to "${baseName}".`,
      );
    }
    seenBases.set(baseName, definition.slug);

    const interfaceName =
      definition.kind === "template" ? `${baseName}Entry` : `${baseName}Value`;
    const fieldMapConstName = `${slugToScreamingSnakeCase(definition.slug)}_FIELDS`;
    const fieldPathTypeName = `${baseName}FieldPath`;
    const fieldPathMap = buildFieldPathMap(definition, fragments);

    return {
      definition,
      interfaceName,
      interfaceSource: renderDefinitionInterface(
        definition,
        interfaceName,
        fragments,
      ),
      fieldMapConstName,
      fieldPathTypeName,
      fieldPathMap,
      slugConstName:
        definition.kind === "template"
          ? `${slugToScreamingSnakeCase(definition.slug)}_SLUG`
          : undefined,
      routeConstName:
        definition.kind === "template" && definition.route
          ? `${slugToScreamingSnakeCase(definition.slug)}_ROUTE`
          : undefined,
    };
  });
}

function renderDefinitionInterface(
  definition: ContentTypeDefinition,
  interfaceName: string,
  fragments: Map<string, FragmentDefinition>,
): string {
  const extendsClause =
    definition.kind === "template" ? " extends NoMessEntry" : "";
  const lines = [`export interface ${interfaceName}${extendsClause} {`];

  for (const field of definition.fields) {
    lines.push(renderNamedField(field, 1, fragments, []));
  }

  lines.push("}");
  return lines.join("\n");
}

function renderNamedField(
  field: NamedFieldDefinition,
  indentLevel: number,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string {
  const indent = "  ".repeat(indentLevel);
  const optional = field.required ? "" : "?";
  const propertyName = toTypePropertyName(field.name);
  const fieldType = renderFieldType(
    field,
    indentLevel,
    fragments,
    fragmentStack,
  );
  return `${indent}${propertyName}${optional}: ${fieldType};`;
}

function renderFieldType(
  field: FieldDefinition,
  indentLevel: number,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string {
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
        return choices
          .map((choice) => JSON.stringify(choice.value))
          .join(" | ");
      }
      return "string";
    }
    case "shopifyProduct":
      return "ShopifyProductRef";
    case "shopifyCollection":
      return "ShopifyCollectionRef";
    case "fragment": {
      const fragment = getFragmentDefinition(
        field.fragment,
        fragments,
        fragmentStack,
      );
      return `${slugToPascalCase(fragment.slug)}Value`;
    }
    case "object":
      return renderObjectType(
        field.fields,
        indentLevel,
        fragments,
        fragmentStack,
      );
    case "array": {
      const itemType = renderFieldType(
        field.of,
        indentLevel,
        fragments,
        fragmentStack,
      );
      return needsArrayParentheses(itemType)
        ? `(${itemType})[]`
        : `${itemType}[]`;
    }
  }
}

function renderObjectType(
  fields: NamedFieldDefinition[],
  indentLevel: number,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string {
  if (fields.length === 0) {
    return "{}";
  }

  const indent = "  ".repeat(indentLevel);
  const lines = ["{"];
  for (const field of fields) {
    lines.push(
      renderNamedField(field, indentLevel + 1, fragments, fragmentStack),
    );
  }
  lines.push(`${indent}}`);
  return lines.join("\n");
}

function buildFieldPathMap(
  definition: ContentTypeDefinition,
  fragments: Map<string, FragmentDefinition>,
): Record<string, string> {
  const paths = collectNamedFieldPaths(definition.fields, "", fragments, []);
  const entries = new Map<string, string>();

  for (const path of paths) {
    const key = fieldPathToCamelCase(path);
    const existing = entries.get(key);
    if (existing && existing !== path) {
      throw new Error(
        `Codegen field path collision in "${definition.slug}": "${existing}" and "${path}" both normalize to "${key}".`,
      );
    }
    entries.set(key, path);
  }

  return Object.fromEntries(entries);
}

function collectNamedFieldPaths(
  fields: NamedFieldDefinition[],
  parentPath: string,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string[] {
  return fields.flatMap((field) => {
    const path = joinPath(parentPath, field.name);
    return collectFieldPaths(field, path, fragments, fragmentStack);
  });
}

function collectFieldPaths(
  field: FieldDefinition,
  currentPath: string,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string[] {
  const paths = [currentPath];

  switch (field.type) {
    case "object":
      paths.push(
        ...collectNamedFieldPaths(
          field.fields,
          currentPath,
          fragments,
          fragmentStack,
        ),
      );
      return paths;
    case "fragment": {
      const fragment = getFragmentDefinition(
        field.fragment,
        fragments,
        fragmentStack,
      );
      paths.push(
        ...collectNamedFieldPaths(fragment.fields, currentPath, fragments, [
          ...fragmentStack,
          fragment.slug,
        ]),
      );
      return paths;
    }
    case "array": {
      const itemPath = `${currentPath}[]`;
      paths.push(itemPath);
      paths.push(
        ...collectAnonymousFieldPaths(
          field.of,
          itemPath,
          fragments,
          fragmentStack,
        ),
      );
      return paths;
    }
    default:
      return paths;
  }
}

function collectAnonymousFieldPaths(
  field: FieldDefinition,
  currentPath: string,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): string[] {
  switch (field.type) {
    case "object":
      return collectNamedFieldPaths(
        field.fields,
        currentPath,
        fragments,
        fragmentStack,
      );
    case "fragment": {
      const fragment = getFragmentDefinition(
        field.fragment,
        fragments,
        fragmentStack,
      );
      return collectNamedFieldPaths(fragment.fields, currentPath, fragments, [
        ...fragmentStack,
        fragment.slug,
      ]);
    }
    case "array": {
      const itemPath = `${currentPath}[]`;
      return [
        itemPath,
        ...collectAnonymousFieldPaths(
          field.of,
          itemPath,
          fragments,
          fragmentStack,
        ),
      ];
    }
    default:
      return [];
  }
}

function getFragmentDefinition(
  reference: string,
  fragments: Map<string, FragmentDefinition>,
  fragmentStack: string[],
): FragmentDefinition {
  const fragment = resolveFragmentDefinition(reference, fragments);
  if (!fragment) {
    throw new Error(
      `Unknown fragment reference "${reference}" in schema codegen.`,
    );
  }

  if (fragmentStack.includes(fragment.slug)) {
    throw new Error(
      `Recursive fragment reference detected: ${[...fragmentStack, fragment.slug].join(" -> ")}`,
    );
  }

  return fragment;
}

function joinPath(parentPath: string, segment: string): string {
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function toTokens(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function ensureTypeIdentifier(value: string): string {
  return /^[A-Za-z_$]/.test(value) ? value : `Generated${value}`;
}

function ensureConstIdentifier(value: string): string {
  return /^[A-Z_$]/.test(value) ? value : `GENERATED_${value}`;
}

function toTypePropertyName(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function needsArrayParentheses(typeSource: string) {
  return typeSource.includes(" | ");
}
