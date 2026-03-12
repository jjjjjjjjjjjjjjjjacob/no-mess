import type {
  ContentTypeDefinition,
  FieldDefinition,
  NamedFieldDefinition,
  PrimitiveFieldDefinition,
} from "@/packages/no-mess-client/src/schema/schema-types";

export interface FieldChange {
  action: "added" | "modified" | "unchanged";
  fieldName: string;
  from?: FieldDefinition;
  to?: FieldDefinition;
}

export interface SchemaDiff {
  added: ContentTypeDefinition[];
  modified: {
    slug: string;
    name: string;
    fieldChanges: FieldChange[];
  }[];
  unchanged: string[];
}

/**
 * Computes a structural diff between existing and incoming content type definitions.
 * Used by the import preview to show what will change.
 */
export function computeSchemaDiff(
  existing: ContentTypeDefinition[],
  incoming: ContentTypeDefinition[],
): SchemaDiff {
  const existingMap = new Map(existing.map((ct) => [ct.slug, ct]));
  const added: ContentTypeDefinition[] = [];
  const modified: SchemaDiff["modified"] = [];
  const matchedSlugs = new Set<string>();

  for (const incomingCt of incoming) {
    const existingCt = existingMap.get(incomingCt.slug);

    if (!existingCt) {
      added.push(incomingCt);
      continue;
    }

    matchedSlugs.add(incomingCt.slug);

    const fieldChanges = computeFieldChanges(
      existingCt.fields,
      incomingCt.fields,
    );

    const hasChanges = fieldChanges.some((fc) => fc.action !== "unchanged");
    const nameChanged = existingCt.name !== incomingCt.name;
    const descChanged =
      (existingCt.description ?? "") !== (incomingCt.description ?? "");
    const kindChanged = existingCt.kind !== incomingCt.kind;
    const modeChanged =
      existingCt.kind === "template" &&
      incomingCt.kind === "template" &&
      existingCt.mode !== incomingCt.mode;
    const routeChanged =
      existingCt.kind === "template" &&
      incomingCt.kind === "template" &&
      (existingCt.route ?? "") !== (incomingCt.route ?? "");

    if (
      hasChanges ||
      nameChanged ||
      descChanged ||
      kindChanged ||
      modeChanged ||
      routeChanged
    ) {
      modified.push({
        slug: incomingCt.slug,
        name: incomingCt.name,
        fieldChanges,
      });
    } else {
      matchedSlugs.add(incomingCt.slug);
    }
  }

  // Unchanged = existing slugs that weren't modified
  const unchanged = existing
    .filter(
      (ct) =>
        matchedSlugs.has(ct.slug) && !modified.some((m) => m.slug === ct.slug),
    )
    .map((ct) => ct.slug);

  return { added, modified, unchanged };
}

function computeFieldChanges(
  existingFields: NamedFieldDefinition[],
  incomingFields: NamedFieldDefinition[],
  parentPath = "",
): FieldChange[] {
  const existingMap = new Map(existingFields.map((f) => [f.name, f]));
  const changes: FieldChange[] = [];
  const seenNames = new Set<string>();

  for (const incoming of incomingFields) {
    const fieldPath = joinFieldPath(parentPath, incoming.name);
    seenNames.add(incoming.name);
    const existing = existingMap.get(incoming.name);

    if (!existing) {
      changes.push({ action: "added", fieldName: fieldPath, to: incoming });
      continue;
    }

    const isModified = isFieldModified(existing, incoming);

    changes.push({
      action: isModified ? "modified" : "unchanged",
      fieldName: fieldPath,
      from: existing,
      to: incoming,
    });

    changes.push(...computeNestedFieldChanges(existing, incoming, fieldPath));
  }

  for (const existing of existingFields) {
    if (!seenNames.has(existing.name)) {
      changes.push({
        action: "unchanged",
        fieldName: joinFieldPath(parentPath, existing.name),
        from: existing,
        to: existing,
      });
    }
  }

  return changes;
}

function computeNestedFieldChanges(
  existing: FieldDefinition,
  incoming: FieldDefinition,
  fieldPath: string,
): FieldChange[] {
  if (existing.type === "object" && incoming.type === "object") {
    return computeFieldChanges(existing.fields, incoming.fields, fieldPath);
  }

  if (existing.type === "array" && incoming.type === "array") {
    return computeArrayItemChanges(existing.of, incoming.of, fieldPath);
  }

  return [];
}

function computeArrayItemChanges(
  existing: FieldDefinition,
  incoming: FieldDefinition,
  arrayPath: string,
): FieldChange[] {
  const itemPath = `${arrayPath}[]`;
  const nestedChanges = computeArrayNestedFieldChanges(
    existing,
    incoming,
    itemPath,
  );

  if (!isFieldModified(existing, incoming) && nestedChanges.length === 0) {
    return [];
  }

  return [
    {
      action: isFieldModified(existing, incoming) ? "modified" : "unchanged",
      fieldName: itemPath,
      from: existing,
      to: incoming,
    },
    ...nestedChanges,
  ];
}

function computeArrayNestedFieldChanges(
  existing: FieldDefinition,
  incoming: FieldDefinition,
  itemPath: string,
): FieldChange[] {
  if (existing.type === "object" && incoming.type === "object") {
    return computeFieldChanges(existing.fields, incoming.fields, itemPath);
  }

  if (existing.type === "array" && incoming.type === "array") {
    return computeArrayItemChanges(existing.of, incoming.of, itemPath);
  }

  return [];
}

function isFieldModified(existing: FieldDefinition, incoming: FieldDefinition) {
  if (existing.type !== incoming.type) {
    return true;
  }

  if (
    existing.required !== incoming.required ||
    existing.label !== incoming.label ||
    existing.description !== incoming.description
  ) {
    return true;
  }

  if (existing.type === "object" && incoming.type === "object") {
    return false;
  }

  if (existing.type === "array" && incoming.type === "array") {
    return (
      existing.minItems !== incoming.minItems ||
      existing.maxItems !== incoming.maxItems
    );
  }

  if (existing.type === "fragment" && incoming.type === "fragment") {
    return existing.fragment !== incoming.fragment;
  }

  if (isPrimitiveField(existing) && isPrimitiveField(incoming)) {
    return (
      JSON.stringify(existing.options ?? {}) !==
      JSON.stringify(incoming.options ?? {})
    );
  }

  return JSON.stringify(existing) !== JSON.stringify(incoming);
}

function joinFieldPath(parentPath: string, fieldName: string) {
  return parentPath ? `${parentPath}.${fieldName}` : fieldName;
}

function isPrimitiveField(
  field: FieldDefinition,
): field is PrimitiveFieldDefinition {
  return (
    field.type !== "object" &&
    field.type !== "array" &&
    field.type !== "fragment"
  );
}
