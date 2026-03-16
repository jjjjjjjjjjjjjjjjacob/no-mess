import type { Field, FieldDefinition } from "./validators";

export interface FragmentReferenceTarget {
  slug: string;
}

export interface FragmentReferenceIssue {
  path: string;
  reference: string;
}

export interface CanonicalizeFragmentReferencesResult {
  fields: Field[];
  changed: boolean;
  unresolved: FragmentReferenceIssue[];
}

function fragmentReferenceToTokens(reference: string): string[] {
  return reference
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\s-]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

export function normalizeFragmentReference(reference: string): string {
  return fragmentReferenceToTokens(reference).join("-");
}

export function resolveFragmentReference<T extends FragmentReferenceTarget>(
  reference: string,
  fragments: Iterable<T>,
): T | null {
  const fragmentList = [...fragments];
  const exactMatch = fragmentList.find(
    (fragment) => fragment.slug === reference,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedReference = normalizeFragmentReference(reference);
  if (!normalizedReference) {
    return null;
  }

  let resolved: T | null = null;
  for (const fragment of fragmentList) {
    if (normalizeFragmentReference(fragment.slug) !== normalizedReference) {
      continue;
    }

    if (resolved && resolved.slug !== fragment.slug) {
      return null;
    }

    resolved = fragment;
  }

  return resolved;
}

export function resolveFragmentReferenceFromMap<
  T extends FragmentReferenceTarget,
>(reference: string, fragments: Map<string, T>): T | null {
  const exactMatch = fragments.get(reference);
  if (exactMatch) {
    return exactMatch;
  }

  return resolveFragmentReference(reference, fragments.values());
}

export function canonicalizeFieldFragmentReferences(
  fields: Field[],
  fragments: Iterable<FragmentReferenceTarget>,
): CanonicalizeFragmentReferencesResult {
  const fragmentList = [...fragments];
  const result = canonicalizeNamedFields(fields, fragmentList, "");
  return {
    fields: result.fields,
    changed: result.changed,
    unresolved: result.unresolved,
  };
}

function canonicalizeNamedFields(
  fields: Field[],
  fragments: FragmentReferenceTarget[],
  parentPath: string,
): CanonicalizeFragmentReferencesResult {
  const nextFields: Field[] = [];
  let changed = false;
  const unresolved: FragmentReferenceIssue[] = [];

  for (const field of fields) {
    const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;
    const result = canonicalizeFieldDefinition(field, fieldPath, fragments);
    nextFields.push(result.field as Field);
    changed = changed || result.changed;
    unresolved.push(...result.unresolved);
  }

  return { fields: nextFields, changed, unresolved };
}

function canonicalizeFieldDefinition(
  field: FieldDefinition,
  path: string,
  fragments: FragmentReferenceTarget[],
): {
  field: FieldDefinition;
  changed: boolean;
  unresolved: FragmentReferenceIssue[];
} {
  switch (field.type) {
    case "object": {
      const result = canonicalizeNamedFields(field.fields, fragments, path);
      return {
        field: result.changed ? { ...field, fields: result.fields } : field,
        changed: result.changed,
        unresolved: result.unresolved,
      };
    }
    case "array": {
      const itemPath = `${path}[]`;
      const result = canonicalizeFieldDefinition(field.of, itemPath, fragments);
      return {
        field: result.changed ? { ...field, of: result.field } : field,
        changed: result.changed,
        unresolved: result.unresolved,
      };
    }
    case "fragment": {
      const resolved = resolveFragmentReference(field.fragment, fragments);
      if (!resolved) {
        return {
          field,
          changed: false,
          unresolved: [{ path, reference: field.fragment }],
        };
      }

      if (resolved.slug === field.fragment) {
        return { field, changed: false, unresolved: [] };
      }

      return {
        field: { ...field, fragment: resolved.slug },
        changed: true,
        unresolved: [],
      };
    }
    default:
      return { field, changed: false, unresolved: [] };
  }
}
