import type {
  ContentTypeDefinition,
  FieldDefinition,
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

    if (hasChanges || nameChanged || descChanged) {
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
  existingFields: FieldDefinition[],
  incomingFields: FieldDefinition[],
): FieldChange[] {
  const existingMap = new Map(existingFields.map((f) => [f.name, f]));
  const changes: FieldChange[] = [];
  const seenNames = new Set<string>();

  // Check incoming fields against existing
  for (const incoming of incomingFields) {
    seenNames.add(incoming.name);
    const existing = existingMap.get(incoming.name);

    if (!existing) {
      changes.push({ action: "added", fieldName: incoming.name, to: incoming });
      continue;
    }

    const isModified =
      existing.type !== incoming.type ||
      existing.required !== incoming.required ||
      (existing.description ?? "") !== (incoming.description ?? "") ||
      JSON.stringify(existing.options) !== JSON.stringify(incoming.options);

    changes.push({
      action: isModified ? "modified" : "unchanged",
      fieldName: incoming.name,
      from: existing,
      to: incoming,
    });
  }

  // Existing fields not in incoming are shown as unchanged (never removed)
  for (const existing of existingFields) {
    if (!seenNames.has(existing.name)) {
      changes.push({
        action: "unchanged",
        fieldName: existing.name,
        from: existing,
        to: existing,
      });
    }
  }

  return changes;
}
