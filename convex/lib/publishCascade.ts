import { resolveFragmentReference } from "./fragmentReferences";
import type { Field, FieldDefinition, SchemaKind } from "./validators";

type DraftSchemaData = {
  name: string;
  slug: string;
  kind: SchemaKind;
  fields: Field[];
};

export type PublishCascadeSchema<TId = string> = {
  _id?: TId;
  name: string;
  slug: string;
  kind: SchemaKind;
  status: "draft" | "published";
  fields: Field[];
  draft?: DraftSchemaData;
};

export type PublishCascadeTarget<TId = string> = {
  _id?: TId;
  name: string;
  slug: string;
  kind: SchemaKind;
};

export type ResolvePublishCascadeArgs<TId = string> = {
  root: {
    schema: PublishCascadeSchema<TId>;
    includeRootIfDraft: boolean;
    useDraftFields: boolean;
  };
  schemas: PublishCascadeSchema<TId>[];
};

function normalizeKind(value: unknown): SchemaKind {
  return value === "fragment" ? "fragment" : "template";
}

function normalizeFields(value: unknown): Field[] {
  return Array.isArray(value) ? (value as Field[]) : [];
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDraftData(
  draft: unknown,
  fallback: {
    fields?: unknown;
    kind?: unknown;
    name: string;
    slug: string;
  },
): DraftSchemaData | undefined {
  if (!draft || typeof draft !== "object") {
    return undefined;
  }

  const raw = draft as Record<string, unknown>;

  return {
    name:
      parseOptionalString(raw.name) ??
      parseOptionalString(fallback.name) ??
      "Untitled Schema",
    slug:
      parseOptionalString(raw.slug) ?? parseOptionalString(fallback.slug) ?? "",
    kind: normalizeKind(raw.kind ?? fallback.kind),
    fields: normalizeFields(raw.fields ?? fallback.fields),
  };
}

export function normalizePublishCascadeSchema<
  TId,
  T extends {
    _id?: TId;
    draft?: unknown;
    fields?: unknown;
    kind?: unknown;
    name: string;
    slug: string;
    status?: unknown;
  },
>(contentType: T): PublishCascadeSchema<TId> {
  const normalized = {
    _id: contentType._id,
    name: contentType.name,
    slug: contentType.slug,
    kind: normalizeKind(contentType.kind),
    status: contentType.status === "draft" ? "draft" : "published",
    fields: normalizeFields(contentType.fields),
  } satisfies PublishCascadeSchema<TId>;

  return {
    ...normalized,
    draft: normalizeDraftData(contentType.draft, normalized),
  };
}

function getSchemaDisplay<TId>(
  schema: PublishCascadeSchema<TId>,
  useDraftFields: boolean,
): PublishCascadeTarget<TId> {
  if (useDraftFields && schema.draft) {
    return {
      _id: schema._id,
      name: schema.draft.name,
      slug: schema.draft.slug,
      kind: schema.draft.kind,
    };
  }

  return {
    _id: schema._id,
    name: schema.name,
    slug: schema.slug,
    kind: schema.kind,
  };
}

function getEffectiveSchemaIdentity<TId>(schema: PublishCascadeSchema<TId>) {
  if (schema.draft) {
    return {
      slug: schema.draft.slug,
      kind: schema.draft.kind,
    };
  }

  return {
    slug: schema.slug,
    kind: schema.kind,
  };
}

function getSchemaFields<TId>(
  schema: PublishCascadeSchema<TId>,
  useDraftFields: boolean,
) {
  return useDraftFields
    ? (schema.draft?.fields ?? schema.fields)
    : schema.fields;
}

function collectFragmentReferences(fields: Field[]): string[] {
  const references: string[] = [];

  for (const field of fields) {
    switch (field.type) {
      case "fragment":
        references.push(field.fragment);
        break;
      case "object":
        references.push(...collectFragmentReferences(field.fields));
        break;
      case "array":
        references.push(...collectAnonymousFragmentReferences(field.of));
        break;
      default:
        break;
    }
  }

  return references;
}

function collectAnonymousFragmentReferences(field: FieldDefinition): string[] {
  switch (field.type) {
    case "fragment":
      return [field.fragment];
    case "object":
      return collectFragmentReferences(field.fields);
    case "array":
      return collectAnonymousFragmentReferences(field.of);
    default:
      return [];
  }
}

function listAvailableFragments<TId>(
  rootSchema: PublishCascadeSchema<TId>,
  schemas: PublishCascadeSchema<TId>[],
) {
  const fragments = schemas
    .filter((schema) => getEffectiveSchemaIdentity(schema).kind === "fragment")
    .map((schema) => ({
      schema,
      slug: getEffectiveSchemaIdentity(schema).slug,
    }));

  if (getEffectiveSchemaIdentity(rootSchema).kind !== "fragment") {
    return fragments;
  }

  return [
    {
      schema: rootSchema,
      slug: getEffectiveSchemaIdentity(rootSchema).slug,
    },
    ...fragments,
  ];
}

export function resolvePublishCascadeTargets<TId>({
  root,
  schemas,
}: ResolvePublishCascadeArgs<TId>) {
  const availableFragments = listAvailableFragments(root.schema, schemas);
  const path = new Set<string>();
  const seenTargets = new Set<string>();
  const cascadeTargets: PublishCascadeTarget<TId>[] = [];

  const visit = (
    schema: PublishCascadeSchema<TId>,
    options: {
      includeIfDraft: boolean;
      useDraftFields: boolean;
    },
  ) => {
    const effectiveIdentity = getEffectiveSchemaIdentity(schema);
    const display = getSchemaDisplay(schema, options.useDraftFields);
    const visitKey = effectiveIdentity.slug || display.slug || schema.slug;

    if (path.has(visitKey)) {
      return;
    }

    path.add(visitKey);

    for (const reference of collectFragmentReferences(
      getSchemaFields(schema, options.useDraftFields),
    )) {
      const fragment = resolveFragmentReference(reference, availableFragments);
      if (!fragment) {
        continue;
      }

      visit(fragment.schema, {
        includeIfDraft: true,
        useDraftFields: fragment.schema.status === "draft",
      });
    }

    path.delete(visitKey);

    if (!options.includeIfDraft || schema.status !== "draft") {
      return;
    }

    const targetSlug = effectiveIdentity.slug || display.slug;
    if (seenTargets.has(targetSlug)) {
      return;
    }

    seenTargets.add(targetSlug);
    cascadeTargets.push({
      ...display,
      slug: targetSlug,
      kind: effectiveIdentity.kind,
    });
  };

  visit(root.schema, {
    includeIfDraft: root.includeRootIfDraft,
    useDraftFields: root.useDraftFields,
  });

  return {
    cascadeTargets,
    expectedCascadeSlugs: cascadeTargets.map((target) => target.slug),
  };
}

function formatTargetList<TId>(targets: PublishCascadeTarget<TId>[]) {
  return targets.map((target) => `${target.name} (${target.slug})`).join(", ");
}

export function formatCascadePublishBlockedError<TId>(
  targets: PublishCascadeTarget<TId>[],
) {
  if (targets.length === 0) {
    return "Cannot publish until all downstream schemas are published.";
  }

  return `Cannot publish until these schemas are published: ${formatTargetList(targets)}`;
}

export function formatCascadePublishStaleError<TId>(
  targets: PublishCascadeTarget<TId>[],
) {
  if (targets.length === 0) {
    return "Publish dependencies changed. Review the publish plan and try again.";
  }

  return `Publish dependencies changed. Review these schemas and try again: ${formatTargetList(targets)}`;
}
