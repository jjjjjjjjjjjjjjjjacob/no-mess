import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { slugify } from "./lib/utils";
import type { Field, FieldDefinition } from "./lib/validators";

type NormalizedContentType = {
  siteId: Id<"sites">;
  slug: string;
  kind: "template" | "fragment";
  mode?: "singleton" | "collection";
  fields: Field[];
};

function normalizeFields(value: unknown): Field[] {
  return Array.isArray(value) ? (value as Field[]) : [];
}

function normalizeContentType(
  contentType:
    | {
        siteId: Id<"sites">;
        slug: string;
        kind?: string;
        mode?: string;
        fields?: unknown;
      }
    | null
    | undefined,
): NormalizedContentType | null {
  if (!contentType) {
    return null;
  }

  const kind = contentType.kind === "fragment" ? "fragment" : "template";
  return {
    siteId: contentType.siteId,
    slug: contentType.slug,
    kind,
    mode:
      kind === "template" && contentType.mode === "singleton"
        ? "singleton"
        : "collection",
    fields: normalizeFields(contentType.fields),
  };
}

function buildFragmentMap(
  contentTypes: {
    slug: string;
    kind?: string;
    mode?: string;
    fields?: unknown;
    siteId: Id<"sites">;
  }[],
) {
  const fragments = contentTypes
    .map((contentType) => normalizeContentType(contentType))
    .filter(
      (contentType): contentType is NormalizedContentType =>
        !!contentType && contentType.kind === "fragment",
    );

  return new Map(fragments.map((fragment) => [fragment.slug, fragment]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isAssetReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("/")
  );
}

function collectAssetIdsFromField(
  field: Field,
  value: unknown,
  fragments: Map<string, NormalizedContentType>,
): string[] {
  switch (field.type) {
    case "image":
      return isAssetReference(value) ? [value] : [];
    case "gallery":
      return Array.isArray(value)
        ? value.filter((item): item is string => isAssetReference(item))
        : [];
    case "object":
      return isRecord(value)
        ? collectAssetIds(field.fields, value, fragments)
        : [];
    case "array":
      return Array.isArray(value)
        ? value.flatMap((item) =>
            collectAssetIdsFromAnonymousField(field.of, item, fragments),
          )
        : [];
    case "fragment": {
      const fragment = fragments.get(field.fragment);
      return fragment && isRecord(value)
        ? collectAssetIds(fragment.fields, value, fragments)
        : [];
    }
    default:
      return [];
  }
}

function collectAssetIdsFromAnonymousField(
  field: FieldDefinition,
  value: unknown,
  fragments: Map<string, NormalizedContentType>,
): string[] {
  return collectAssetIdsFromField(field as Field, value, fragments);
}

function collectAssetIds(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  fragments: Map<string, NormalizedContentType>,
): string[] {
  if (!content) {
    return [];
  }

  return fields.flatMap((field) =>
    collectAssetIdsFromField(field, content[field.name], fragments),
  );
}

async function buildAssetUrlMap(
  getAsset: (assetId: Id<"assets">) => Promise<{
    siteId: Id<"sites">;
    url: string;
  } | null>,
  siteId: Id<"sites">,
  assetIds: Iterable<string>,
) {
  const uniqueAssetIds = [...new Set(assetIds)];
  if (uniqueAssetIds.length === 0) {
    return new Map<string, string>();
  }

  const assets = await Promise.all(
    uniqueAssetIds.map(async (assetId) => {
      const asset = await getAsset(assetId as Id<"assets">);
      return [assetId, asset] as const;
    }),
  );

  const assetUrls = new Map<string, string>();
  for (const [assetId, asset] of assets) {
    if (asset?.siteId === siteId && asset.url) {
      assetUrls.set(assetId, asset.url);
    }
  }

  return assetUrls;
}

function resolveAnonymousFieldValue(
  field: FieldDefinition,
  value: unknown,
  assetUrls: Map<string, string>,
  fragments: Map<string, NormalizedContentType>,
): unknown {
  switch (field.type) {
    case "image":
      return typeof value === "string"
        ? (assetUrls.get(value) ?? value)
        : value;
    case "gallery":
      return Array.isArray(value)
        ? value.map((item) =>
            typeof item === "string" ? (assetUrls.get(item) ?? item) : item,
          )
        : value;
    case "object":
      return isRecord(value)
        ? resolveAssetBackedContent(field.fields, value, assetUrls, fragments)
        : value;
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            resolveAnonymousFieldValue(field.of, item, assetUrls, fragments),
          )
        : value;
    case "fragment": {
      const fragment = fragments.get(field.fragment);
      return fragment && isRecord(value)
        ? resolveAssetBackedContent(
            fragment.fields,
            value,
            assetUrls,
            fragments,
          )
        : value;
    }
    default:
      return value;
  }
}

function resolveAssetBackedContent(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  assetUrls: Map<string, string>,
  fragments: Map<string, NormalizedContentType>,
): Record<string, unknown> {
  if (!content) {
    return {};
  }

  const resolvedContent: Record<string, unknown> = { ...content };
  for (const field of fields) {
    resolvedContent[field.name] = resolveAnonymousFieldValue(
      field,
      content[field.name],
      assetUrls,
      fragments,
    );
  }

  return resolvedContent;
}

async function getSiteFragments(ctx: QueryCtx, siteId: Id<"sites">) {
  const contentTypes = await ctx.db
    .query("contentTypes")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  return buildFragmentMap(contentTypes);
}

export const getByIdInternal = internalQuery({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      return null;
    }

    const contentType = normalizeContentType(
      await ctx.db.get(entry.contentTypeId),
    );
    const fragments = await getSiteFragments(ctx, entry.siteId);
    const draftContent = (entry.draft as Record<string, unknown>) ?? {};
    const assetUrls = await buildAssetUrlMap(
      async (assetId) => await ctx.db.get(assetId),
      entry.siteId,
      collectAssetIds(contentType?.fields ?? [], draftContent, fragments),
    );

    return {
      slug: entry.slug,
      title: entry.title,
      ...resolveAssetBackedContent(
        contentType?.fields ?? [],
        draftContent,
        assetUrls,
        fragments,
      ),
      _id: entry._id,
      _status: entry.status,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    };
  },
});

export const create = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
    title: v.string(),
    slug: v.optional(v.string()),
    draft: v.any(),
  },
  handler: async (ctx, args) => {
    const contentType = normalizeContentType(
      await ctx.db.get(args.contentTypeId),
    );
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    if (contentType.kind === "fragment") {
      throw new ConvexError("Fragments cannot have content entries");
    }

    const { user } = await requireSiteAccess(ctx, contentType.siteId);
    const entrySlug =
      args.slug ??
      (contentType.mode === "singleton"
        ? contentType.slug
        : slugify(args.title));

    if (contentType.mode === "singleton") {
      const existingEntries = await ctx.db
        .query("contentEntries")
        .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
        .collect();
      if (existingEntries.length > 0) {
        throw new ConvexError("Singleton templates can only have one entry");
      }
    }

    const existing = await ctx.db
      .query("contentEntries")
      .withIndex("by_slug", (q) =>
        q
          .eq("siteId", contentType.siteId)
          .eq("contentTypeId", args.contentTypeId)
          .eq("slug", entrySlug),
      )
      .first();

    if (existing) {
      throw new ConvexError("An entry with this slug already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("contentEntries", {
      siteId: contentType.siteId,
      contentTypeId: args.contentTypeId,
      title: args.title,
      slug: entrySlug,
      draft: args.draft,
      status: "draft",
      createdAt: now,
      createdBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    entryId: v.id("contentEntries"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    draft: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const contentType = normalizeContentType(
      await ctx.db.get(entry.contentTypeId),
    );
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    if (args.slug !== undefined && args.slug !== entry.slug) {
      const slugToCheck = args.slug;
      if (contentType.mode === "singleton") {
        throw new ConvexError(
          "Singleton entry slugs are fixed by their template",
        );
      }

      const existing = await ctx.db
        .query("contentEntries")
        .withIndex("by_slug", (q) =>
          q
            .eq("siteId", entry.siteId)
            .eq("contentTypeId", entry.contentTypeId)
            .eq("slug", slugToCheck),
        )
        .first();

      if (existing) {
        throw new ConvexError("An entry with this slug already exists");
      }
    }

    await ctx.db.patch(args.entryId, {
      updatedAt: Date.now(),
      updatedBy: user._id,
      ...(args.title !== undefined ? { title: args.title } : {}),
      ...(args.slug !== undefined ? { slug: args.slug } : {}),
      ...(args.draft !== undefined ? { draft: args.draft } : {}),
    });
  },
});

export const publish = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);
    const now = Date.now();

    await ctx.db.patch(args.entryId, {
      published: entry.draft,
      status: "published",
      publishedAt: now,
      publishedBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});

export const unpublish = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    const { user } = await requireSiteAccess(ctx, entry.siteId);

    await ctx.db.patch(args.entryId, {
      published: undefined,
      status: "draft",
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

export const remove = mutation({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);
    await ctx.db.delete(args.entryId);
  },
});

export const get = query({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);
    return entry;
  },
});

export const listByType = query({
  args: {
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const contentType = normalizeContentType(
      await ctx.db.get(args.contentTypeId),
    );
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    await requireSiteAccess(ctx, contentType.siteId);

    return await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    if (args.status !== undefined) {
      const statusFilter = args.status;
      return await ctx.db
        .query("contentEntries")
        .withIndex("by_status", (q) =>
          q.eq("siteId", args.siteId).eq("status", statusFilter),
        )
        .collect();
    }

    return await ctx.db
      .query("contentEntries")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();
  },
});

export const countByTypeInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();

    const siteEntries = entries.filter((entry) => entry.siteId === args.siteId);
    return {
      published: siteEntries.filter((entry) => entry.status === "published")
        .length,
      draft: siteEntries.filter((entry) => entry.status === "draft").length,
      total: siteEntries.length,
    };
  },
});

export const listPublishedByType = internalQuery({
  args: {
    contentTypeId: v.id("contentTypes"),
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    const contentType = normalizeContentType(
      await ctx.db.get(args.contentTypeId),
    );
    const fragments = await getSiteFragments(ctx, args.siteId);
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();

    const publishedEntries = entries.filter(
      (entry) => entry.status === "published",
    );
    const assetUrls = await buildAssetUrlMap(
      async (assetId) => await ctx.db.get(assetId),
      args.siteId,
      publishedEntries.flatMap((entry) =>
        collectAssetIds(
          contentType?.fields ?? [],
          (entry.published as Record<string, unknown>) ?? {},
          fragments,
        ),
      ),
    );

    return publishedEntries.map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      ...resolveAssetBackedContent(
        contentType?.fields ?? [],
        (entry.published as Record<string, unknown>) ?? {},
        assetUrls,
        fragments,
      ),
      _id: entry._id,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    }));
  },
});

export const getBySlugInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
    slug: v.string(),
    preview: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("contentEntries")
      .withIndex("by_slug", (q) =>
        q
          .eq("siteId", args.siteId)
          .eq("contentTypeId", args.contentTypeId)
          .eq("slug", args.slug),
      )
      .first();

    if (!entry) {
      return null;
    }

    const content = args.preview
      ? (entry.draft as Record<string, unknown>)
      : (entry.published as Record<string, unknown> | undefined);

    if (!content && !args.preview) {
      return null;
    }

    const contentType = normalizeContentType(
      await ctx.db.get(args.contentTypeId),
    );
    const fragments = await getSiteFragments(ctx, args.siteId);
    const assetUrls = await buildAssetUrlMap(
      async (assetId) => await ctx.db.get(assetId),
      args.siteId,
      collectAssetIds(contentType?.fields ?? [], content, fragments),
    );

    return {
      slug: entry.slug,
      title: entry.title,
      ...resolveAssetBackedContent(
        contentType?.fields ?? [],
        content,
        assetUrls,
        fragments,
      ),
      _id: entry._id,
      _status: entry.status,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    };
  },
});
