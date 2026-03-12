import type {
  ContentTypeDefinition,
  FieldDefinition,
  FragmentDefinition,
  NamedFieldDefinition,
} from "./schema-types";

type PathSegment = string | number;

export function buildFragmentMap(
  definitions: ContentTypeDefinition[],
): Map<string, FragmentDefinition> {
  const fragments = definitions.filter(
    (definition): definition is FragmentDefinition =>
      definition.kind === "fragment",
  );
  return new Map(fragments.map((fragment) => [fragment.slug, fragment]));
}

export function getFieldDisplayName(field: { name?: string; label?: string }) {
  if (field.label) {
    return field.label;
  }

  if (!field.name) {
    return "Item";
  }

  return field.name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function joinFieldPath(basePath: string, segment: PathSegment): string {
  if (typeof segment === "number") {
    return `${basePath}[${segment}]`;
  }

  return basePath ? `${basePath}.${segment}` : segment;
}

export function parseFieldPath(path: string): PathSegment[] {
  if (!path) {
    return [];
  }

  const segments: PathSegment[] = [];
  let token = "";

  for (let index = 0; index < path.length; index += 1) {
    const char = path[index];

    if (char === ".") {
      if (token) {
        segments.push(token);
        token = "";
      }
      continue;
    }

    if (char === "[") {
      if (token) {
        segments.push(token);
        token = "";
      }

      const endIndex = path.indexOf("]", index);
      if (endIndex === -1) {
        break;
      }

      const rawIndex = path.slice(index + 1, endIndex);
      const parsedIndex = Number(rawIndex);
      if (!Number.isNaN(parsedIndex)) {
        segments.push(parsedIndex);
      }
      index = endIndex;
      continue;
    }

    token += char;
  }

  if (token) {
    segments.push(token);
  }

  return segments;
}

export function getValueAtPath(value: unknown, path: string): unknown {
  const segments = parseFieldPath(path);
  let current = value;

  for (const segment of segments) {
    if (current == null) {
      return undefined;
    }

    if (typeof segment === "number") {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment];
      continue;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function cloneContainer(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (value && typeof value === "object") {
    return { ...(value as Record<string, unknown>) };
  }

  return value;
}

export function setValueAtPath<T>(value: T, path: string, nextValue: unknown): T {
  const segments = parseFieldPath(path);

  if (segments.length === 0) {
    return nextValue as T;
  }

  const root =
    value && typeof value === "object"
      ? (cloneContainer(value) as Record<string, unknown> | unknown[])
      : typeof segments[0] === "number"
        ? []
        : {};

  let current: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];

    if (typeof segment === "number") {
      const array = current as unknown[];
      if (isLast) {
        array[segment] = nextValue;
        break;
      }

      const existing = array[segment];
      const cloned =
        cloneContainer(existing) ??
        (typeof nextSegment === "number" ? [] : {});
      array[segment] = cloned;
      current = cloned as Record<string, unknown> | unknown[];
      continue;
    }

    const record = current as Record<string, unknown>;
    if (isLast) {
      record[segment] = nextValue;
      break;
    }

    const existing = record[segment];
    const cloned =
      cloneContainer(existing) ??
      (typeof nextSegment === "number" ? [] : {});
    record[segment] = cloned;
    current = cloned as Record<string, unknown> | unknown[];
  }

  return root as T;
}

export function appendValueAtPath<T>(
  value: T,
  path: string,
  item: unknown,
): T {
  const currentValue = getValueAtPath(value, path);
  const nextItems = Array.isArray(currentValue) ? [...currentValue, item] : [item];
  return setValueAtPath(value, path, nextItems);
}

export function removeValueAtPath<T>(
  value: T,
  path: string,
  indexToRemove: number,
): T {
  const currentValue = getValueAtPath(value, path);
  const nextItems = Array.isArray(currentValue)
    ? currentValue.filter((_, index) => index !== indexToRemove)
    : [];
  return setValueAtPath(value, path, nextItems);
}

export function moveArrayValueAtPath<T>(
  value: T,
  path: string,
  fromIndex: number,
  toIndex: number,
): T {
  const currentValue = getValueAtPath(value, path);
  if (!Array.isArray(currentValue)) {
    return value;
  }

  if (
    fromIndex < 0 ||
    fromIndex >= currentValue.length ||
    toIndex < 0 ||
    toIndex >= currentValue.length
  ) {
    return value;
  }

  const nextItems = [...currentValue];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return setValueAtPath(value, path, nextItems);
}

export function createEmptyValueForField(field: FieldDefinition): unknown {
  switch (field.type) {
    case "object":
      return Object.fromEntries(
        field.fields.map((child) => [child.name, createEmptyValueForField(child)]),
      );
    case "array":
    case "gallery":
      return [];
    case "boolean":
      return false;
    case "number":
      return 0;
    default:
      return "";
  }
}

export function resolveFragmentFields(
  field: FieldDefinition,
  fragments: Map<string, FragmentDefinition>,
  stack: string[] = [],
): NamedFieldDefinition[] | null {
  if (field.type !== "fragment") {
    return null;
  }

  if (stack.includes(field.fragment)) {
    return null;
  }

  const fragment = fragments.get(field.fragment);
  if (!fragment) {
    return null;
  }

  return fragment.fields.map((child) => ({ ...child }));
}
