import { ConvexError, v } from "convex/values";
import { getTemplateMigration } from "../lib/template-migrations";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { requireSiteAccess, requireSiteOwner } from "./lib/access";
import {
  type Field,
  type SchemaKind,
  type TemplateMode,
  validateNamedFields,
} from "./lib/validators";

type DraftSchemaData = {
  name: string;
  slug: string;
  kind: SchemaKind;
  mode?: TemplateMode;
  route?: string;
  description?: string;
  fields: Field[];
};

function normalizeKind(value: unknown): SchemaKind {
  return value === "fragment" ? "fragment" : "template";
}

function normalizeMode(value: unknown): TemplateMode {
  return value === "singleton" ? "singleton" : "collection";
}

function normalizeFields(value: unknown): Field[] {
  return Array.isArray(value) ? (value as Field[]) : [];
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function assertValidFields(fields: unknown) {
  const errors = validateNamedFields(fields);
  if (errors.length > 0) {
    throw new ConvexError(errors.join("; "));
  }
  return normalizeFields(fields);
}

async function assertSlugAvailable(
  ctx: MutationCtx,
  siteId: Id<"sites">,
  slug: string,
  excludeContentTypeId?: Id<"contentTypes">,
) {
  const existing = await ctx.db
    .query("contentTypes")
    .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
    .first();

  if (existing && existing._id !== excludeContentTypeId) {
    throw new ConvexError(
      "A content type with this slug already exists for this site",
    );
  }
}

async function assertCanBecomeFragment(
  ctx: MutationCtx,
  contentTypeId: Id<"contentTypes">,
) {
  const entries = await ctx.db
    .query("contentEntries")
    .withIndex("by_type", (q) => q.eq("contentTypeId", contentTypeId))
    .collect();

  if (entries.length > 0) {
    throw new ConvexError(
      "Templates with entries cannot be converted into fragments",
    );
  }
}

function normalizeDraftData(
  draft: unknown,
  fallback: {
    name: string;
    slug: string;
    kind?: unknown;
    mode?: unknown;
    route?: unknown;
    description?: unknown;
    fields?: unknown;
  },
): DraftSchemaData | undefined {
  if (!draft || typeof draft !== "object") {
    return undefined;
  }

  const raw = draft as Record<string, unknown>;
  const kind = normalizeKind(raw.kind ?? fallback.kind);
  return {
    name:
      parseOptionalString(raw.name) ??
      parseOptionalString(fallback.name) ??
      "Untitled Schema",
    slug:
      parseOptionalString(raw.slug) ?? parseOptionalString(fallback.slug) ?? "",
    kind,
    mode:
      kind === "template"
        ? normalizeMode(raw.mode ?? fallback.mode)
        : undefined,
    route:
      kind === "template"
        ? (parseOptionalString(raw.route) ??
          parseOptionalString(fallback.route))
        : undefined,
    description:
      parseOptionalString(raw.description) ??
      parseOptionalString(fallback.description),
    fields: normalizeFields(raw.fields ?? fallback.fields),
  };
}

function normalizeContentTypeRecord<
  T extends Record<string, unknown> & {
    name: string;
    slug: string;
    siteId: Id<"sites">;
  },
>(contentType: T) {
  const kind = normalizeKind(contentType.kind);
  const normalized = {
    ...contentType,
    kind,
    mode: kind === "template" ? normalizeMode(contentType.mode) : undefined,
    route:
      kind === "template" ? parseOptionalString(contentType.route) : undefined,
    fields: normalizeFields(contentType.fields),
  };

  const draft = normalizeDraftData(contentType.draft, normalized);
  return {
    ...normalized,
    draft,
  };
}

function mergeFields(
  existingFields: Field[],
  incomingFields: Field[],
): Field[] {
  const existingByName = new Map(
    existingFields.map((field) => [field.name, field]),
  );
  const merged: Field[] = [];

  for (const incomingField of incomingFields) {
    const existingField = existingByName.get(incomingField.name);
    existingByName.delete(incomingField.name);

    if (
      existingField &&
      existingField.type === "object" &&
      incomingField.type === "object"
    ) {
      merged.push({
        ...incomingField,
        fields: mergeFields(existingField.fields, incomingField.fields),
      });
      continue;
    }

    merged.push(incomingField);
  }

  return [...merged, ...existingByName.values()];
}

function buildDraftData(input: {
  name: string;
  slug: string;
  kind?: unknown;
  mode?: unknown;
  route?: unknown;
  description?: string;
  fields: Field[];
}): DraftSchemaData {
  const kind = normalizeKind(input.kind);
  return {
    name: input.name.trim(),
    slug: input.slug.trim(),
    kind,
    mode: kind === "template" ? normalizeMode(input.mode) : undefined,
    route: kind === "template" ? parseOptionalString(input.route) : undefined,
    description: parseOptionalString(input.description),
    fields: input.fields,
  };
}

async function runSchemaModelBackfillForSite(
  ctx: MutationCtx,
  siteId?: Id<"sites">,
) {
  const contentTypes = siteId
    ? await ctx.db
        .query("contentTypes")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect()
    : await ctx.db.query("contentTypes").collect();

  let updated = 0;

  for (const contentType of contentTypes) {
    const normalized = normalizeContentTypeRecord(contentType);
    await ctx.db.patch(contentType._id, {
      kind: normalized.kind,
      mode: normalized.mode,
      route: normalized.route,
      fields: normalized.fields,
      draft: normalized.draft,
      updatedAt: Date.now(),
    });
    updated += 1;
  }

  return { updated };
}

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    slug: v.string(),
    kind: v.optional(v.string()),
    mode: v.optional(v.string()),
    route: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.any(),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const fields = assertValidFields(args.fields);
    await assertSlugAvailable(ctx, args.siteId, args.slug);

    const draftData = buildDraftData({
      name: args.name,
      slug: args.slug,
      kind: args.kind,
      mode: args.mode,
      route: args.route,
      description: args.description,
      fields,
    });

    const contentTypeId = await ctx.db.insert("contentTypes", {
      siteId: args.siteId,
      name: draftData.name,
      slug: draftData.slug,
      kind: draftData.kind,
      mode: draftData.mode,
      route: draftData.route,
      description: draftData.description,
      fields: draftData.fields,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return contentTypeId;
  },
});

export const update = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    kind: v.optional(v.string()),
    mode: v.optional(v.string()),
    route: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteAccess(ctx, normalized.siteId);

    const nextKind = normalizeKind(args.kind ?? normalized.kind);
    if (normalized.kind === "template" && nextKind === "fragment") {
      await assertCanBecomeFragment(ctx, args.contentTypeId);
    }

    if (args.slug !== undefined) {
      await assertSlugAvailable(
        ctx,
        normalized.siteId,
        args.slug,
        args.contentTypeId,
      );
    }

    const fields =
      args.fields !== undefined
        ? assertValidFields(args.fields)
        : normalized.fields;

    await ctx.db.patch(args.contentTypeId, {
      updatedAt: Date.now(),
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.slug !== undefined ? { slug: args.slug.trim() } : {}),
      ...(args.description !== undefined
        ? { description: parseOptionalString(args.description) }
        : {}),
      ...(args.kind !== undefined ? { kind: nextKind } : {}),
      ...(args.mode !== undefined ||
      (args.kind !== undefined && nextKind === "template")
        ? {
            mode:
              nextKind === "template"
                ? normalizeMode(args.mode ?? normalized.mode)
                : undefined,
          }
        : {}),
      ...(args.route !== undefined ||
      (args.kind !== undefined && nextKind === "fragment")
        ? {
            route:
              nextKind === "template"
                ? parseOptionalString(args.route ?? normalized.route)
                : undefined,
          }
        : {}),
      ...(args.fields !== undefined ? { fields } : {}),
    });
  },
});

export const remove = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteOwner(ctx, normalized.siteId);

    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    await ctx.db.delete(args.contentTypeId);
  },
});

export const get = query({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteAccess(ctx, normalized.siteId);

    return normalized;
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const contentTypes = await ctx.db
      .query("contentTypes")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return contentTypes.map((contentType) => {
      const normalized = normalizeContentTypeRecord(contentType);
      const { draft: _draft, ...rest } = normalized;
      return {
        ...rest,
        status: (normalized.status ?? "published") as "draft" | "published",
        hasDraft: normalized.draft !== undefined,
      };
    });
  },
});

export const getBySlug = query({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const contentType = await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", args.slug),
      )
      .first();

    return contentType ? normalizeContentTypeRecord(contentType) : null;
  },
});

export const checkSlugAvailability = query({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
    excludeContentTypeId: v.optional(v.id("contentTypes")),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const existing = await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", args.slug),
      )
      .first();

    const isTaken =
      existing !== null &&
      (!args.excludeContentTypeId ||
        existing._id !== args.excludeContentTypeId);

    if (!isTaken) {
      return { available: true, slug: args.slug, suggestions: [] };
    }

    const suggestions: string[] = [];
    for (let index = 1; index <= 10 && suggestions.length < 3; index += 1) {
      const candidate = `${args.slug}-${index}`;
      const taken = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", args.siteId).eq("slug", candidate),
        )
        .first();
      if (!taken) {
        suggestions.push(candidate);
      }
    }

    return { available: false, slug: args.slug, suggestions };
  },
});

export const listBySiteInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const contentTypes = await ctx.db
      .query("contentTypes")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return contentTypes
      .filter((contentType) => contentType.status !== "draft")
      .map((contentType) => normalizeContentTypeRecord(contentType));
  },
});

export const getBySlugInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", args.slug),
      )
      .first();

    if (!contentType || contentType.status === "draft") {
      return null;
    }

    return normalizeContentTypeRecord(contentType);
  },
});

export const createDraft = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    kind: v.optional(v.string()),
    mode: v.optional(v.string()),
    route: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const name = args.name?.trim() || "Untitled Schema";
    const slug = args.slug?.trim() || "";
    const fields = assertValidFields(args.fields ?? []);

    if (slug) {
      await assertSlugAvailable(ctx, args.siteId, slug);
    }

    const now = Date.now();
    const draftData = buildDraftData({
      name,
      slug,
      kind: args.kind,
      mode: args.mode,
      route: args.route,
      description: args.description,
      fields,
    });

    const contentTypeId = await ctx.db.insert("contentTypes", {
      siteId: args.siteId,
      name: draftData.name,
      slug: draftData.slug,
      kind: draftData.kind,
      mode: draftData.mode,
      route: draftData.route,
      description: draftData.description,
      fields: draftData.fields,
      status: "draft",
      draft: draftData,
      draftUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return contentTypeId;
  },
});

export const runSchemaModelBackfill = mutation({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);
    return runSchemaModelBackfillForSite(ctx, args.siteId);
  },
});

export const runTemplateMigration = mutation({
  args: {
    siteId: v.id("sites"),
    migrationName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSiteOwner(ctx, args.siteId);

    const migration = getTemplateMigration(args.migrationName);
    if (!migration) {
      throw new ConvexError(
        `Unknown template migration: ${args.migrationName}`,
      );
    }

    const contentType = await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", migration.contentTypeSlug),
      )
      .first();

    if (!contentType) {
      throw new ConvexError(
        `Content type not found for migration: ${migration.contentTypeSlug}`,
      );
    }

    const normalized = normalizeContentTypeRecord(contentType);
    const nextFields = migration.nextFields ?? normalized.fields;
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", contentType._id))
      .collect();

    const now = Date.now();

    for (const entry of entries) {
      await ctx.db.patch(entry._id, {
        draft: isRecord(entry.draft)
          ? migration.transformEntry(entry.draft)
          : entry.draft,
        published: isRecord(entry.published)
          ? migration.transformEntry(entry.published)
          : entry.published,
        updatedAt: now,
      });
    }

    await ctx.db.patch(contentType._id, {
      fields: nextFields,
      draft: normalized.draft
        ? {
            ...normalized.draft,
            fields: nextFields,
          }
        : undefined,
      updatedAt: now,
    });

    return {
      migration: migration.name,
      contentTypeId: contentType._id,
      updatedEntries: entries.length,
    };
  },
});

export const saveDraft = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    kind: v.optional(v.string()),
    mode: v.optional(v.string()),
    route: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteAccess(ctx, normalized.siteId);

    const currentDraft = normalized.draft;
    const nextKind = normalizeKind(
      args.kind ?? currentDraft?.kind ?? normalized.kind,
    );
    if (normalized.kind === "template" && nextKind === "fragment") {
      await assertCanBecomeFragment(ctx, args.contentTypeId);
    }

    const draftData = buildDraftData({
      name:
        args.name?.trim() ?? currentDraft?.name ?? (normalized.name as string),
      slug:
        args.slug?.trim() ?? currentDraft?.slug ?? (normalized.slug as string),
      kind: nextKind,
      mode: args.mode ?? currentDraft?.mode ?? normalized.mode,
      route: args.route ?? currentDraft?.route ?? normalized.route,
      description:
        args.description !== undefined
          ? args.description
          : (currentDraft?.description ??
            (normalized.description as string | undefined)),
      fields:
        args.fields !== undefined
          ? assertValidFields(args.fields)
          : (currentDraft?.fields ?? normalized.fields),
    });

    if (draftData.slug) {
      await assertSlugAvailable(
        ctx,
        normalized.siteId,
        draftData.slug,
        args.contentTypeId,
      );
    }

    const now = Date.now();
    const status = normalized.status ?? "published";

    if (status === "draft") {
      await ctx.db.patch(args.contentTypeId, {
        name: draftData.name,
        slug: draftData.slug,
        kind: draftData.kind,
        mode: draftData.mode,
        route: draftData.route,
        description: draftData.description,
        fields: draftData.fields,
        draft: draftData,
        draftUpdatedAt: now,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.patch(args.contentTypeId, {
      draft: draftData,
      draftUpdatedAt: now,
      updatedAt: now,
    });
  },
});

export const publish = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteAccess(ctx, normalized.siteId);

    const draft = normalized.draft;
    const kind = draft?.kind ?? normalized.kind;
    const name = draft?.name ?? (normalized.name as string);
    const slug = draft?.slug ?? (normalized.slug as string);
    const description =
      draft?.description ?? (normalized.description as string | undefined);
    const mode =
      kind === "template" ? (draft?.mode ?? normalized.mode) : undefined;
    const route =
      kind === "template" ? (draft?.route ?? normalized.route) : undefined;
    const fields = draft?.fields ?? normalized.fields;

    if (!name?.trim()) {
      throw new ConvexError("Name is required to publish");
    }
    if (!slug?.trim()) {
      throw new ConvexError("Slug is required to publish");
    }
    if (fields.length === 0) {
      throw new ConvexError("At least one field is required to publish");
    }

    assertValidFields(fields);
    await assertSlugAvailable(ctx, normalized.siteId, slug, args.contentTypeId);

    const now = Date.now();
    await ctx.db.patch(args.contentTypeId, {
      name: name.trim(),
      slug: slug.trim(),
      kind,
      mode,
      route,
      description: parseOptionalString(description),
      fields,
      status: "published",
      draft: undefined,
      draftUpdatedAt: undefined,
      publishedAt: now,
      updatedAt: now,
    });
  },
});

export const discardDraft = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const normalized = normalizeContentTypeRecord(contentType);
    await requireSiteAccess(ctx, normalized.siteId as never);

    if ((normalized.status ?? "published") === "draft") {
      throw new ConvexError(
        "Cannot discard draft on a draft-only schema. Use delete instead.",
      );
    }

    await ctx.db.patch(args.contentTypeId, {
      draft: undefined,
      draftUpdatedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const syncFromSchema = internalMutation({
  args: {
    siteId: v.id("sites"),
    contentTypes: v.any(),
  },
  handler: async (ctx, args) => {
    if (!Array.isArray(args.contentTypes)) {
      throw new ConvexError("contentTypes must be an array");
    }

    const results: { slug: string; action: "created" | "updated" }[] = [];

    for (const rawDefinition of args.contentTypes) {
      if (!rawDefinition || typeof rawDefinition !== "object") {
        throw new ConvexError("Each schema definition must be an object");
      }

      const incoming = rawDefinition as Record<string, unknown>;
      if (
        typeof incoming.slug !== "string" ||
        typeof incoming.name !== "string"
      ) {
        throw new ConvexError(
          "Each schema definition must include slug and name",
        );
      }

      const validatedFields = assertValidFields(incoming.fields);
      const draftData = buildDraftData({
        name: incoming.name,
        slug: incoming.slug,
        kind: incoming.kind,
        mode: incoming.mode,
        route: incoming.route,
        description: incoming.description as string | undefined,
        fields: validatedFields,
      });

      const existing = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", args.siteId).eq("slug", draftData.slug),
        )
        .first();

      if (existing) {
        const normalizedExisting = normalizeContentTypeRecord(existing);
        if (
          normalizedExisting.kind === "template" &&
          draftData.kind === "fragment"
        ) {
          await assertCanBecomeFragment(ctx, existing._id);
        }

        const mergedFields = mergeFields(
          normalizedExisting.fields,
          draftData.fields,
        );
        const mergedDraft = { ...draftData, fields: mergedFields };
        const now = Date.now();

        if ((normalizedExisting.status ?? "published") === "draft") {
          await ctx.db.patch(existing._id, {
            name: mergedDraft.name,
            slug: mergedDraft.slug,
            kind: mergedDraft.kind,
            mode: mergedDraft.mode,
            route: mergedDraft.route,
            description: mergedDraft.description,
            fields: mergedDraft.fields,
            draft: mergedDraft,
            draftUpdatedAt: now,
            updatedAt: now,
          });
        } else {
          await ctx.db.patch(existing._id, {
            draft: mergedDraft,
            draftUpdatedAt: now,
            updatedAt: now,
          });
        }

        results.push({ slug: mergedDraft.slug, action: "updated" });
        continue;
      }

      const now = Date.now();
      await ctx.db.insert("contentTypes", {
        siteId: args.siteId,
        name: draftData.name,
        slug: draftData.slug,
        kind: draftData.kind,
        mode: draftData.mode,
        route: draftData.route,
        description: draftData.description,
        fields: draftData.fields,
        status: "draft",
        draft: draftData,
        draftUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ slug: draftData.slug, action: "created" });
    }

    return results;
  },
});

export const backfillSchemaModel = internalMutation({
  args: {
    siteId: v.optional(v.id("sites")),
  },
  handler: (ctx, args) => runSchemaModelBackfillForSite(ctx, args.siteId),
});
