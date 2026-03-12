import {
  FIELD_TYPES,
  type ContentTypeDefinition,
  type FieldDefinition,
  type NamedFieldDefinition,
  type SchemaKind,
  type TemplateMode,
} from "./schema-types";

export interface ParseError {
  line: number;
  column: number;
  message: string;
}

export interface ParseWarning {
  line: number;
  message: string;
}

export interface ParseResult {
  success: boolean;
  contentTypes: ContentTypeDefinition[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

interface ObjectEntry {
  key: string;
  value: string;
}

interface DefineContentTypeResult {
  contentType: ContentTypeDefinition | null;
  errors: ParseError[];
  warnings: ParseWarning[];
}

const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);
const DEFINITION_CALL_PATTERN = /define(ContentType|Template|Fragment)\s*\(/g;
const VARIABLE_DEFINITION_PATTERN =
  /(?:const|let|var|export\s+const)\s+(\w+)\s*=\s*define(ContentType|Template|Fragment)\s*\(/g;

/**
 * Parses schema DSL source text and extracts template/fragment definitions.
 * Never throws; returns partial results + errors.
 */
export function parseSchemaSource(source: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const contentTypes: ContentTypeDefinition[] = [];

  const stripped = stripComments(source);
  const references = collectDefinitionReferences(stripped);
  let match: RegExpExecArray | null;

  while ((match = DEFINITION_CALL_PATTERN.exec(stripped)) !== null) {
    const definitionName = match[1];
    const startIdx = match.index + match[0].length;
    const line = lineAt(source, match.index);

    try {
      const result = parseDefinitionArgs(
        stripped,
        startIdx,
        line,
        definitionName,
        references,
      );
      if (result.contentType) {
        contentTypes.push(result.contentType);
      }
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }
    } catch {
      errors.push({
        line,
        column: 0,
        message: `Failed to parse define${definitionName} call`,
      });
    }
  }

  return {
    success: errors.length === 0 && contentTypes.length > 0,
    contentTypes,
    errors,
    warnings,
  };
}

function collectDefinitionReferences(source: string) {
  const refs = new Map<string, { kind: SchemaKind; slug: string }>();
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_DEFINITION_PATTERN.exec(source)) !== null) {
    const variableName = match[1];
    const definitionName = match[2];
    const slugStart = skipWhitespace(source, match.index + match[0].length);
    const slug = parseStringLiteral(source, slugStart)?.value;

    if (!slug) {
      continue;
    }

    refs.set(variableName, {
      kind: definitionName === "Fragment" ? "fragment" : "template",
      slug,
    });
  }

  return refs;
}

function parseDefinitionArgs(
  source: string,
  startIdx: number,
  baseLine: number,
  definitionName: string,
  references: Map<string, { kind: SchemaKind; slug: string }>,
): DefineContentTypeResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  let index = skipWhitespace(source, startIdx);

  const slugResult = parseStringLiteral(source, index);
  if (!slugResult) {
    errors.push({
      line: baseLine,
      column: columnAt(source, index),
      message: "Expected string literal for schema slug",
    });
    return { contentType: null, errors, warnings };
  }

  const slug = slugResult.value;
  index = skipWhitespace(source, slugResult.end);

  if (source[index] !== ",") {
    errors.push({
      line: lineAt(source, index),
      column: columnAt(source, index),
      message: "Expected comma after slug",
    });
    return { contentType: null, errors, warnings };
  }

  index = skipWhitespace(source, index + 1);
  if (source[index] !== "{") {
    errors.push({
      line: lineAt(source, index),
      column: columnAt(source, index),
      message: "Expected object literal for schema config",
    });
    return { contentType: null, errors, warnings };
  }

  const configBlock = extractBalanced(source, index, "{", "}");
  if (!configBlock) {
    errors.push({
      line: lineAt(source, index),
      column: columnAt(source, index),
      message: "Unterminated config object",
    });
    return { contentType: null, errors, warnings };
  }

  const configEntries = parseObjectEntries(configBlock.inner);
  const name = parseStringValue(findObjectEntry(configEntries, "name")?.value);
  if (!name) {
    warnings.push({
      line: baseLine,
      message: `Missing "name" for schema "${slug}"; using slug as name`,
    });
  }

  const description = parseStringValue(
    findObjectEntry(configEntries, "description")?.value,
  );
  const route = parseStringValue(findObjectEntry(configEntries, "route")?.value);
  const rawMode = parseStringValue(findObjectEntry(configEntries, "mode")?.value);
  const mode: TemplateMode = rawMode === "singleton" ? "singleton" : "collection";

  const fieldsEntry = findObjectEntry(configEntries, "fields");
  const fields = fieldsEntry
    ? parseFieldEntries(
        unwrapObjectLiteral(fieldsEntry.value),
        baseLine,
        errors,
        warnings,
        references,
      )
    : [];

  if (!fieldsEntry) {
    warnings.push({
      line: baseLine,
      message: `Schema "${slug}" is missing a fields object`,
    });
  }

  if (definitionName === "Fragment") {
    return {
      contentType: {
        kind: "fragment",
        slug,
        name: name || slug,
        ...(description ? { description } : {}),
        fields,
      },
      errors,
      warnings,
    };
  }

  return {
    contentType: {
      kind: "template",
      slug,
      name: name || slug,
      ...(description ? { description } : {}),
      ...(route ? { route } : {}),
      mode,
      fields,
    },
    errors,
    warnings,
  };
}

function parseFieldEntries(
  body: string,
  baseLine: number,
  errors: ParseError[],
  warnings: ParseWarning[],
  references: Map<string, { kind: SchemaKind; slug: string }>,
): NamedFieldDefinition[] {
  const fields: NamedFieldDefinition[] = [];
  const entries = parseObjectEntries(body);

  for (const entry of entries) {
    const definition = parseFieldExpression(
      entry.value,
      baseLine,
      entry.key,
      errors,
      warnings,
      references,
    );

    if (definition) {
      fields.push({
        name: entry.key,
        ...definition,
      });
    }
  }

  return fields;
}

function parseFieldExpression(
  expression: string,
  baseLine: number,
  fieldName: string,
  errors: ParseError[],
  warnings: ParseWarning[],
  references: Map<string, { kind: SchemaKind; slug: string }>,
): FieldDefinition | null {
  const trimmed = expression.trim();
  const match = /^field\s*\.\s*(\w+)\s*\(/.exec(trimmed);

  if (!match) {
    errors.push({
      line: baseLine,
      column: 0,
      message: `Expected field builder for "${fieldName}"`,
    });
    return null;
  }

  const fieldType = match[1];
  if (!FIELD_TYPE_SET.has(fieldType)) {
    errors.push({
      line: baseLine,
      column: 0,
      message: `Unknown field type "${fieldType}" for field "${fieldName}"`,
    });
    return null;
  }

  const argsBlock = extractBalancedFrom(trimmed, match[0].length - 1, "(", ")");
  const rawArgs = argsBlock?.inner.trim() ?? "";

  if (fieldType === "object") {
    const options = parseFieldOptionsObject(rawArgs);
    const nestedFieldsEntry = findObjectEntry(options, "fields");
    if (!nestedFieldsEntry) {
      warnings.push({
        line: baseLine,
        message: `Object field "${fieldName}" is missing nested fields`,
      });
    }

    return {
      type: "object",
      required:
        parseBooleanValue(findObjectEntry(options, "required")?.value) ?? false,
      label: parseStringValue(findObjectEntry(options, "label")?.value),
      description: parseStringValue(
        findObjectEntry(options, "description")?.value,
      ),
      fields: nestedFieldsEntry
        ? parseFieldEntries(
            unwrapObjectLiteral(nestedFieldsEntry.value),
            baseLine,
            errors,
            warnings,
            references,
          )
        : [],
    };
  }

  if (fieldType === "array") {
    const options = parseFieldOptionsObject(rawArgs);
    const ofEntry = findObjectEntry(options, "of");
    const of = ofEntry
      ? parseFieldExpression(
          ofEntry.value,
          baseLine,
          `${fieldName}[]`,
          errors,
          warnings,
          references,
        )
      : null;

    if (!of) {
      errors.push({
        line: baseLine,
        column: 0,
        message: `Array field "${fieldName}" is missing a valid "of" definition`,
      });
      return null;
    }

    return {
      type: "array",
      required:
        parseBooleanValue(findObjectEntry(options, "required")?.value) ?? false,
      label: parseStringValue(findObjectEntry(options, "label")?.value),
      description: parseStringValue(
        findObjectEntry(options, "description")?.value,
      ),
      of,
      minItems: parseNumberValue(findObjectEntry(options, "minItems")?.value),
      maxItems: parseNumberValue(findObjectEntry(options, "maxItems")?.value),
    };
  }

  if (fieldType === "fragment") {
    const args = splitTopLevel(rawArgs);
    const fragmentToken = args[0]?.trim() ?? "";
    const fragment =
      parseStringValue(fragmentToken) ??
      references.get(fragmentToken)?.slug ??
      fragmentToken.replace(/[^\w-]/g, "");

    if (!fragment) {
      errors.push({
        line: baseLine,
        column: 0,
        message: `Fragment field "${fieldName}" is missing a fragment reference`,
      });
      return null;
    }

    const options =
      args.length > 1 ? parseFieldOptionsObject(args.slice(1).join(",")) : [];

    return {
      type: "fragment",
      required:
        parseBooleanValue(findObjectEntry(options, "required")?.value) ?? false,
      label: parseStringValue(findObjectEntry(options, "label")?.value),
      description: parseStringValue(
        findObjectEntry(options, "description")?.value,
      ),
      fragment,
    };
  }

  const options = rawArgs ? parseFieldOptionsObject(rawArgs) : [];
  const label = parseStringValue(findObjectEntry(options, "label")?.value);
  const description = parseStringValue(
    findObjectEntry(options, "description")?.value,
  );
  const required =
    parseBooleanValue(findObjectEntry(options, "required")?.value) ?? false;

  if (fieldType === "select") {
    const choices = parseChoicesArray(
      findObjectEntry(options, "choices")?.value,
    );

    return {
      type: "select",
      required,
      ...(label ? { label } : {}),
      ...(description ? { description } : {}),
      ...(choices ? { options: { choices } } : {}),
    };
  }

  return {
    type: fieldType as Exclude<
      FieldDefinition["type"],
      "object" | "array" | "fragment" | "select"
    >,
    required,
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
  };
}

function parseFieldOptionsObject(value: string): ObjectEntry[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (!trimmed.startsWith("{")) {
    return [];
  }

  return parseObjectEntries(unwrapObjectLiteral(trimmed));
}

function parseChoicesArray(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("[")) {
    return undefined;
  }

  const items = splitTopLevel(unwrapArrayLiteral(trimmed));
  const choices: { label: string; value: string }[] = [];

  for (const item of items) {
    const entries = parseObjectEntries(unwrapObjectLiteral(item));
    const label = parseStringValue(findObjectEntry(entries, "label")?.value);
    const choiceValue = parseStringValue(findObjectEntry(entries, "value")?.value);

    if (label !== undefined && choiceValue !== undefined) {
      choices.push({ label, value: choiceValue });
    }
  }

  return choices;
}

function parseObjectEntries(body: string): ObjectEntry[] {
  const entries = splitTopLevel(body);
  const result: ObjectEntry[] = [];

  for (const entry of entries) {
    const separatorIndex = findTopLevelColon(entry);
    if (separatorIndex === -1) {
      continue;
    }

    const rawKey = entry.slice(0, separatorIndex).trim();
    const rawValue = entry.slice(separatorIndex + 1).trim();
    if (!rawKey || !rawValue) {
      continue;
    }

    result.push({
      key: parseObjectKey(rawKey),
      value: rawValue,
    });
  }

  return result;
}

function findObjectEntry(entries: ObjectEntry[], key: string) {
  return entries.find((entry) => entry.key === key);
}

function parseObjectKey(rawKey: string) {
  return parseStringValue(rawKey) ?? rawKey;
}

function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let current = "";
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (inString) {
      current += char;
      if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      current += char;
      continue;
    }

    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;
    if (char === "{") braceDepth++;
    if (char === "}") braceDepth--;
    if (char === "[") bracketDepth++;
    if (char === "]") bracketDepth--;

    if (
      char === "," &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function findTopLevelColon(source: string) {
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === "(") parenDepth++;
    if (char === ")") parenDepth--;
    if (char === "{") braceDepth++;
    if (char === "}") braceDepth--;
    if (char === "[") bracketDepth++;
    if (char === "]") bracketDepth--;

    if (
      char === ":" &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      return index;
    }
  }

  return -1;
}

function parseStringValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return parseStringLiteral(value.trim(), 0)?.value;
}

function parseBooleanValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return undefined;
}

function parseNumberValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function unwrapObjectLiteral(value: string) {
  const trimmed = value.trim();
  const block = extractBalanced(trimmed, 0, "{", "}");
  return block?.inner ?? "";
}

function unwrapArrayLiteral(value: string) {
  const trimmed = value.trim();
  const block = extractBalanced(trimmed, 0, "[", "]");
  return block?.inner ?? "";
}

function stripComments(source: string): string {
  let result = "";
  let index = 0;
  let inString: string | null = null;
  let escaped = false;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (escaped) {
      result += char;
      escaped = false;
      index += 1;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
        result += char;
        index += 1;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      result += char;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      result += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          index += 2;
          break;
        }
        result += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

function columnAt(source: string, index: number): number {
  let column = 1;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (source[i] === "\n") {
      break;
    }
    column += 1;
  }
  return column;
}

function skipWhitespace(source: string, index: number): number {
  let current = index;
  while (current < source.length && /\s/.test(source[current])) {
    current += 1;
  }
  return current;
}

function parseStringLiteral(
  source: string,
  startIdx: number,
): { value: string; end: number } | null {
  if (startIdx >= source.length) {
    return null;
  }

  const quote = source[startIdx];
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    return null;
  }

  let value = "";
  let index = startIdx + 1;
  let escaped = false;

  while (index < source.length) {
    const char = source[index];

    if (escaped) {
      switch (char) {
        case "n":
          value += "\n";
          break;
        case "t":
          value += "\t";
          break;
        case "\\":
          value += "\\";
          break;
        default:
          value += char;
          break;
      }
      escaped = false;
      index += 1;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === quote) {
      return { value, end: index + 1 };
    }

    value += char;
    index += 1;
  }

  return null;
}

function extractBalanced(
  source: string,
  startIdx: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  if (source[startIdx] !== open) {
    return null;
  }

  return extractBalancedFrom(source, startIdx, open, close);
}

function extractBalancedFrom(
  source: string,
  openIdx: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  const contentStart = openIdx + 1;

  for (let index = openIdx; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (char === "\\") {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = char;
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }

    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          inner: source.slice(contentStart, index),
          end: index + 1,
        };
      }
    }
  }

  return null;
}
