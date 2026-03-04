import {
  FIELD_TYPES,
  type ContentTypeDefinition,
  type FieldDefinition,
  type FieldType,
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

const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);

/**
 * Parses schema DSL source text and extracts ContentTypeDefinition[].
 * Custom recursive-descent parser — no TS compiler, no eval.
 * Never throws; returns partial results + errors.
 */
export function parseSchemaSource(source: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const contentTypes: ContentTypeDefinition[] = [];

  // Strip comments (line and block) while preserving line positions
  const stripped = stripComments(source);

  // Find all defineContentType( occurrences
  const pattern = /defineContentType\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(stripped)) !== null) {
    const startIdx = match.index + match[0].length;
    const line = lineAt(source, match.index);

    try {
      const result = parseDefineContentTypeArgs(stripped, startIdx, line);
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
        message: "Failed to parse defineContentType call",
      });
    }
  }

  // Also support standalone defineSchema({ contentTypes: [...] }) wrapping
  // The individual defineContentType calls inside are already captured above

  return {
    success: errors.length === 0 && contentTypes.length > 0,
    contentTypes,
    errors,
    warnings,
  };
}

/**
 * Strip line comments (//) and block comments while preserving newlines.
 */
function stripComments(source: string): string {
  let result = "";
  let i = 0;
  let inString: string | null = null;
  let escaped = false;

  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];

    if (escaped) {
      result += ch;
      escaped = false;
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        escaped = true;
        result += ch;
        i++;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      result += ch;
      i++;
      continue;
    }

    // Template literals
    if (ch === "`") {
      inString = "`";
      result += ch;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      result += ch;
      i++;
      continue;
    }

    // Line comment
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") {
        result += " ";
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length) {
        if (source[i] === "*" && source[i + 1] === "/") {
          i += 2;
          break;
        }
        result += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function lineAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
}

function columnAt(source: string, index: number): number {
  let col = 1;
  for (let i = index - 1; i >= 0; i--) {
    if (source[i] === "\n") break;
    col++;
  }
  return col;
}

interface DefineContentTypeResult {
  contentType: ContentTypeDefinition | null;
  errors: ParseError[];
  warnings: ParseWarning[];
}

/**
 * Parse the arguments of defineContentType(slug, config).
 * `startIdx` points to the character after the opening `(`.
 */
function parseDefineContentTypeArgs(
  source: string,
  startIdx: number,
  baseLine: number,
): DefineContentTypeResult {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  let i = skipWhitespace(source, startIdx);

  // Parse slug (first string argument)
  const slugResult = parseStringLiteral(source, i);
  if (!slugResult) {
    errors.push({
      line: baseLine,
      column: columnAt(source, i),
      message: "Expected string literal for content type slug",
    });
    return { contentType: null, errors, warnings };
  }
  const slug = slugResult.value;
  i = skipWhitespace(source, slugResult.end);

  // Expect comma
  if (source[i] !== ",") {
    errors.push({
      line: lineAt(source, i),
      column: columnAt(source, i),
      message: "Expected comma after slug",
    });
    return { contentType: null, errors, warnings };
  }
  i = skipWhitespace(source, i + 1);

  // Parse config object
  if (source[i] !== "{") {
    errors.push({
      line: lineAt(source, i),
      column: columnAt(source, i),
      message: "Expected object literal for content type config",
    });
    return { contentType: null, errors, warnings };
  }

  const configResult = extractBalanced(source, i, "{", "}");
  if (!configResult) {
    errors.push({
      line: lineAt(source, i),
      column: columnAt(source, i),
      message: "Unterminated config object",
    });
    return { contentType: null, errors, warnings };
  }

  const configBody = configResult.inner;

  // Extract name
  const name = extractPropertyString(configBody, "name");
  if (!name) {
    warnings.push({
      line: baseLine,
      message: `Missing "name" for content type "${slug}" — using slug as name`,
    });
  }

  // Extract description
  const description = extractPropertyString(configBody, "description");

  // Extract fields block
  const fields: FieldDefinition[] = [];
  const fieldsMatch = /fields\s*:\s*\{/.exec(configBody);
  if (fieldsMatch) {
    const fieldsStart =
      configBody.indexOf("{", fieldsMatch.index + fieldsMatch[0].length - 1);
    const fieldsBlock = extractBalanced(configBody, fieldsStart, "{", "}");
    if (fieldsBlock) {
      const fieldEntries = parseFieldEntries(
        fieldsBlock.inner,
        lineAt(source, startIdx),
        errors,
        warnings,
      );
      fields.push(...fieldEntries);
    }
  }

  const contentType: ContentTypeDefinition = {
    slug,
    name: name || slug,
    fields,
  };

  if (description) {
    contentType.description = description;
  }

  return { contentType, errors, warnings };
}

/**
 * Parse field entries from the fields object body.
 * Each entry is: fieldName: field.type({ ... }) or field.type()
 */
function parseFieldEntries(
  body: string,
  baseLine: number,
  errors: ParseError[],
  warnings: ParseWarning[],
): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  // Match patterns like: fieldName: field.type(...) or fieldName: field.type()
  const fieldPattern =
    /(\w+)\s*:\s*field\s*\.\s*(\w+)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = fieldPattern.exec(body)) !== null) {
    const fieldName = match[1];
    const fieldType = match[2];
    const argsStart = match.index + match[0].length;

    if (!FIELD_TYPE_SET.has(fieldType)) {
      errors.push({
        line: baseLine,
        column: 0,
        message: `Unknown field type "${fieldType}" for field "${fieldName}"`,
      });
      continue;
    }

    // Extract the arguments to field.type(...)
    // Find matching closing paren
    const argsResult = extractBalancedFrom(body, argsStart - 1, "(", ")");
    const argsBody = argsResult ? argsResult.inner : "";

    const fieldDef: FieldDefinition = {
      name: fieldName,
      type: fieldType as FieldType,
      required: false,
    };

    // Parse options from args body
    if (argsBody.trim()) {
      // Look for required
      const requiredMatch = /required\s*:\s*(true|false)/.exec(argsBody);
      if (requiredMatch) {
        fieldDef.required = requiredMatch[1] === "true";
      }

      // Look for description
      const descMatch = /description\s*:\s*/.exec(argsBody);
      if (descMatch) {
        const descStart = descMatch.index + descMatch[0].length;
        const descStr = parseStringLiteral(argsBody, skipWhitespace(argsBody, descStart));
        if (descStr) {
          fieldDef.description = descStr.value;
        }
      }

      // Look for choices (select type)
      if (fieldType === "select") {
        const choices = parseChoicesArray(argsBody);
        if (choices.length > 0) {
          fieldDef.options = { choices };
        }
      }
    }

    fields.push(fieldDef);
  }

  return fields;
}

/**
 * Parse a choices array from text like:
 * choices: [{ label: "Foo", value: "foo" }, ...]
 */
function parseChoicesArray(
  text: string,
): { label: string; value: string }[] {
  const choices: { label: string; value: string }[] = [];

  const choicesMatch = /choices\s*:\s*\[/.exec(text);
  if (!choicesMatch) return choices;

  const arrayStart = text.indexOf("[", choicesMatch.index);
  const arrayBlock = extractBalanced(text, arrayStart, "[", "]");
  if (!arrayBlock) return choices;

  // Find each { ... } in the array
  const objPattern = /\{/g;
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objPattern.exec(arrayBlock.inner)) !== null) {
    const objBlock = extractBalanced(
      arrayBlock.inner,
      objMatch.index,
      "{",
      "}",
    );
    if (!objBlock) continue;

    const label = extractPropertyString(objBlock.inner, "label");
    const value = extractPropertyString(objBlock.inner, "value");

    if (label && value) {
      choices.push({ label, value });
    }
  }

  return choices;
}

// === Utility functions ===

function skipWhitespace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index])) {
    index++;
  }
  return index;
}

/**
 * Parse a string literal (single-quoted, double-quoted, or backtick) at position i.
 */
function parseStringLiteral(
  source: string,
  i: number,
): { value: string; end: number } | null {
  if (i >= source.length) return null;
  const quote = source[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;

  let value = "";
  let j = i + 1;
  let escaped = false;

  while (j < source.length) {
    const ch = source[j];

    if (escaped) {
      switch (ch) {
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
          value += ch;
          break;
      }
      escaped = false;
      j++;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      j++;
      continue;
    }

    if (ch === quote) {
      return { value, end: j + 1 };
    }

    value += ch;
    j++;
  }

  return null; // unterminated string
}

/**
 * Extract balanced delimiters starting at position i (which must be the opening delimiter).
 */
function extractBalanced(
  source: string,
  i: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  if (source[i] !== open) return null;
  return extractBalancedFrom(source, i, open, close);
}

function extractBalancedFrom(
  source: string,
  i: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  const start = i + 1;

  while (i < source.length) {
    const ch = source[i];

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        escaped = true;
        i++;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      i++;
      continue;
    }

    if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        return { inner: source.slice(start, i), end: i + 1 };
      }
    }

    i++;
  }

  return null;
}

/**
 * Extract a string property value from an object literal body.
 * Matches: propName: "value" or propName: 'value'
 */
function extractPropertyString(body: string, propName: string): string | null {
  const pattern = new RegExp(`${propName}\\s*:\\s*`);
  const match = pattern.exec(body);
  if (!match) return null;

  const valueStart = match.index + match[0].length;
  const i = skipWhitespace(body, valueStart);
  const result = parseStringLiteral(body, i);
  return result ? result.value : null;
}
