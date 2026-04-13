import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalQuery,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requireSiteAccess } from "./lib/access";
import { resolveFragmentReferenceFromMap } from "./lib/fragmentReferences";
import {
  formatCascadePublishBlockedError,
  formatCascadePublishStaleError,
  normalizePublishCascadeSchema,
  resolvePublishCascadeTargets,
} from "./lib/publishCascade";
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

function getShopifyHandle(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (
    isRecord(value) &&
    typeof value.handle === "string" &&
    value.handle.trim().length > 0
  ) {
    return value.handle.trim();
  }

  return null;
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
      const fragment = resolveFragmentReferenceFromMap(
        field.fragment,
        fragments,
      );
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

function collectShopifyHandlesFromField(
  field: Field,
  value: unknown,
  fragments: Map<string, NormalizedContentType>,
): { products: string[]; collections: string[] } {
  switch (field.type) {
    case "shopifyProduct": {
      const handle = getShopifyHandle(value);
      return { products: handle ? [handle] : [], collections: [] };
    }
    case "shopifyCollection": {
      const handle = getShopifyHandle(value);
      return { products: [], collections: handle ? [handle] : [] };
    }
    case "object":
      return isRecord(value)
        ? collectShopifyHandles(field.fields, value, fragments)
        : { products: [], collections: [] };
    case "array":
      return Array.isArray(value)
        ? value.reduce(
            (acc, item) => {
              const handles = collectShopifyHandlesFromAnonymousField(
                field.of,
                item,
                fragments,
              );
              return {
                products: [...acc.products, ...handles.products],
                collections: [...acc.collections, ...handles.collections],
              };
            },
            { products: [] as string[], collections: [] as string[] },
          )
        : { products: [], collections: [] };
    case "fragment": {
      const fragment = resolveFragmentReferenceFromMap(
        field.fragment,
        fragments,
      );
      return fragment && isRecord(value)
        ? collectShopifyHandles(fragment.fields, value, fragments)
        : { products: [], collections: [] };
    }
    default:
      return { products: [], collections: [] };
  }
}

function collectShopifyHandlesFromAnonymousField(
  field: FieldDefinition,
  value: unknown,
  fragments: Map<string, NormalizedContentType>,
): { products: string[]; collections: string[] } {
  return collectShopifyHandlesFromField(field as Field, value, fragments);
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

function collectShopifyHandles(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  fragments: Map<string, NormalizedContentType>,
): { products: string[]; collections: string[] } {
  if (!content) {
    return { products: [], collections: [] };
  }

  return fields.reduce(
    (acc, field) => {
      const handles = collectShopifyHandlesFromField(
        field,
        content[field.name],
        fragments,
      );
      return {
        products: [...acc.products, ...handles.products],
        collections: [...acc.collections, ...handles.collections],
      };
    },
    { products: [] as string[], collections: [] as string[] },
  );
}

async function buildAssetUrlMap(
  ctx: QueryCtx,
  siteId: Id<"sites">,
  assetIds: Iterable<string>,
) {
  const uniqueAssetIds = [...new Set(assetIds)];
  if (uniqueAssetIds.length === 0) {
    return new Map<string, string>();
  }

  const assets = await Promise.all(
    uniqueAssetIds.map(async (assetId) => {
      const asset = await ctx.db.get(assetId as Id<"assets">);
      return [assetId, asset] as const;
    }),
  );

  const assetUrls = new Map<string, string>();
  for (const [assetId, asset] of assets) {
    if (asset?.siteId === siteId && asset.url) {
      assetUrls.set(assetId, asset.optimizedUrl ?? asset.url);
    }
  }

  return assetUrls;
}

// Rich image data for ?images=rich API mode
interface AssetVariantData {
  url: string;
  width: number;
  height: number;
}

interface AssetData {
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
  originalUrl?: string;
  originalMimeType?: string;
  variants?: AssetVariantData[];
}

type AssetContentMap =
  | { kind: "plain"; map: Map<string, string> }
  | { kind: "rich"; map: Map<string, AssetData> };

async function buildAssetDataMap(
  ctx: QueryCtx,
  siteId: Id<"sites">,
  assetIds: Iterable<string>,
) {
  const uniqueAssetIds = [...new Set(assetIds)];
  if (uniqueAssetIds.length === 0) {
    return new Map<string, AssetData>();
  }

  const assets = await Promise.all(
    uniqueAssetIds.map(async (assetId) => {
      const asset = await ctx.db.get(assetId as Id<"assets">);
      return [assetId, asset] as const;
    }),
  );

  // Batch-fetch variants for all asset IDs
  const variantsByAsset = new Map<string, AssetVariantData[]>();
  const variantResults = await Promise.all(
    uniqueAssetIds.map(async (assetId) => {
      const variants = await ctx.db
        .query("assetVariants")
        .withIndex("by_asset", (q) => q.eq("assetId", assetId as Id<"assets">))
        .collect();
      return [assetId, variants] as const;
    }),
  );
  for (const [assetId, variants] of variantResults) {
    if (variants.length > 0) {
      variantsByAsset.set(
        assetId,
        variants
          .sort((a, b) => a.width - b.width)
          .map((v) => ({ url: v.url, width: v.width, height: v.height })),
      );
    }
  }

  const assetDataMap = new Map<string, AssetData>();
  for (const [assetId, asset] of assets) {
    if (asset?.siteId === siteId && asset.url) {
      const variants = variantsByAsset.get(assetId);
      const optimizedUrl = asset.optimizedUrl;
      const optimizedMimeType = asset.optimizedMimeType;
      const isOptimized =
        optimizedUrl !== undefined && optimizedMimeType !== undefined;
      assetDataMap.set(assetId, {
        url: isOptimized ? optimizedUrl : asset.url,
        width: asset.width,
        height: asset.height,
        mimeType: isOptimized ? optimizedMimeType : asset.mimeType,
        size: asset.optimizedSize ?? asset.size,
        ...(isOptimized
          ? { originalUrl: asset.url, originalMimeType: asset.mimeType }
          : {}),
        ...(variants ? { variants } : {}),
      });
    }
  }

  return assetDataMap;
}

async function buildAssetContentMap(
  ctx: QueryCtx,
  siteId: Id<"sites">,
  assetIds: Iterable<string>,
  images?: "rich",
): Promise<AssetContentMap> {
  if (images === "rich") {
    return {
      kind: "rich",
      map: await buildAssetDataMap(ctx, siteId, assetIds),
    };
  }

  return {
    kind: "plain",
    map: await buildAssetUrlMap(ctx, siteId, assetIds),
  };
}

function resolveAssetBackedEntryContent(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  assetContentMap: AssetContentMap,
  fragments: Map<string, NormalizedContentType>,
) {
  if (assetContentMap.kind === "rich") {
    return resolveAssetBackedContentRich(
      fields,
      content,
      assetContentMap.map,
      fragments,
    );
  }

  return resolveAssetBackedContent(
    fields,
    content,
    assetContentMap.map,
    fragments,
  );
}

function resolveAnonymousFieldValueRich(
  field: FieldDefinition,
  value: unknown,
  assetData: Map<string, AssetData>,
  fragments: Map<string, NormalizedContentType>,
): unknown {
  switch (field.type) {
    case "image":
      return typeof value === "string"
        ? (assetData.get(value) ?? value)
        : value;
    case "gallery":
      return Array.isArray(value)
        ? value.map((item) =>
            typeof item === "string" ? (assetData.get(item) ?? item) : item,
          )
        : value;
    case "object":
      return isRecord(value)
        ? resolveAssetBackedContentRich(
            field.fields,
            value,
            assetData,
            fragments,
          )
        : value;
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            resolveAnonymousFieldValueRich(
              field.of,
              item,
              assetData,
              fragments,
            ),
          )
        : value;
    case "fragment": {
      const fragment = resolveFragmentReferenceFromMap(
        field.fragment,
        fragments,
      );
      return fragment && isRecord(value)
        ? resolveAssetBackedContentRich(
            fragment.fields,
            value,
            assetData,
            fragments,
          )
        : value;
    }
    default:
      return value;
  }
}

function resolveAssetBackedContentRich(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  assetData: Map<string, AssetData>,
  fragments: Map<string, NormalizedContentType>,
): Record<string, unknown> {
  if (!content) {
    return {};
  }

  const resolvedContent: Record<string, unknown> = { ...content };
  for (const field of fields) {
    resolvedContent[field.name] = resolveAnonymousFieldValueRich(
      field,
      content[field.name],
      assetData,
      fragments,
    );
  }

  return resolvedContent;
}

async function buildShopifyMaps(
  ctx: QueryCtx,
  siteId: Id<"sites">,
  handles: { products: string[]; collections: string[] },
) {
  const productHandles = [...new Set(handles.products)];
  const collectionHandles = [...new Set(handles.collections)];

  const [products, collections] = await Promise.all([
    Promise.all(
      productHandles.map(async (handle) => {
        const product = await ctx.db
          .query("shopifyProducts")
          .withIndex("by_handle", (q) =>
            q.eq("siteId", siteId).eq("handle", handle),
          )
          .first();
        return [handle, product] as const;
      }),
    ),
    Promise.all(
      collectionHandles.map(async (handle) => {
        const collection = await ctx.db
          .query("shopifyCollections")
          .withIndex("by_handle", (q) =>
            q.eq("siteId", siteId).eq("handle", handle),
          )
          .first();
        return [handle, collection] as const;
      }),
    ),
  ]);

  return {
    products: new Map(products),
    collections: new Map(collections),
  };
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
      const fragment = resolveFragmentReferenceFromMap(
        field.fragment,
        fragments,
      );
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

function resolveExpandedAnonymousFieldValue(
  field: FieldDefinition,
  value: unknown,
  fragments: Map<string, NormalizedContentType>,
  productMap: Map<string, unknown>,
  collectionMap: Map<string, unknown>,
): unknown {
  switch (field.type) {
    case "shopifyProduct": {
      const handle = getShopifyHandle(value);
      return handle ? (productMap.get(handle) ?? value) : value;
    }
    case "shopifyCollection": {
      const handle = getShopifyHandle(value);
      return handle ? (collectionMap.get(handle) ?? value) : value;
    }
    case "object":
      return isRecord(value)
        ? resolveExpandedContent(
            field.fields,
            value,
            fragments,
            productMap,
            collectionMap,
          )
        : value;
    case "array":
      return Array.isArray(value)
        ? value.map((item) =>
            resolveExpandedAnonymousFieldValue(
              field.of,
              item,
              fragments,
              productMap,
              collectionMap,
            ),
          )
        : value;
    case "fragment": {
      const fragment = resolveFragmentReferenceFromMap(
        field.fragment,
        fragments,
      );
      return fragment && isRecord(value)
        ? resolveExpandedContent(
            fragment.fields,
            value,
            fragments,
            productMap,
            collectionMap,
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

function resolveExpandedContent(
  fields: Field[],
  content: Record<string, unknown> | null | undefined,
  fragments: Map<string, NormalizedContentType>,
  productMap: Map<string, unknown>,
  collectionMap: Map<string, unknown>,
): Record<string, unknown> {
  if (!content) {
    return {};
  }

  const resolvedContent: Record<string, unknown> = { ...content };
  for (const field of fields) {
    resolvedContent[field.name] = resolveExpandedAnonymousFieldValue(
      field,
      content[field.name],
      fragments,
      productMap,
      collectionMap,
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

async function getPublishedSiteFragments(ctx: QueryCtx, siteId: Id<"sites">) {
  const contentTypes = await ctx.db
    .query("contentTypes")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();

  return buildFragmentMap(
    contentTypes.filter((contentType) => contentType.status !== "draft"),
  );
}

type PublishPlanTarget = {
  _id?: Id<"contentTypes">;
  kind: "template" | "fragment";
  name: string;
  slug: string;
};

function formatPlanTargets(targets: PublishPlanTarget[]) {
  return targets.map(({ _id, ...target }) => target);
}

function assertExpectedCascadeSlugs(
  expectedCascadeSlugs: string[] | undefined,
  currentTargets: PublishPlanTarget[],
) {
  const currentSlugs = currentTargets.map((target) => target.slug);
  const matches =
    Array.isArray(expectedCascadeSlugs) &&
    expectedCascadeSlugs.length === currentSlugs.length &&
    expectedCascadeSlugs.every((slug, index) => slug === currentSlugs[index]);

  if (!matches) {
    throw new ConvexError(formatCascadePublishStaleError(currentTargets));
  }
}

async function resolvePublishSource(
  ctx: MutationCtx,
  entry: {
    _id: Id<"contentEntries">;
    siteId: Id<"sites">;
    title: string;
    draft: unknown;
  },
  draftId?: Id<"contentEntryDrafts">,
) {
  if (!draftId) {
    return {
      title: entry.title,
      draft: entry.draft,
    };
  }

  const savedDraft = await ctx.db.get(draftId);
  if (!savedDraft || savedDraft.entryId !== entry._id) {
    throw new ConvexError("Saved draft not found");
  }

  if (savedDraft.siteId !== entry.siteId) {
    throw new ConvexError("Saved draft does not belong to this entry");
  }

  return {
    title: savedDraft.title,
    draft: savedDraft.draft,
  };
}

async function getEntryPublishPlan(
  ctx: QueryCtx | MutationCtx,
  entryId: Id<"contentEntries">,
) {
  const entry = await ctx.db.get(entryId);
  if (!entry) {
    throw new ConvexError("Content entry not found");
  }

  const contentType = await ctx.db.get(entry.contentTypeId);
  if (!contentType) {
    throw new ConvexError("Content type not found");
  }

  const siteContentTypes = await ctx.db
    .query("contentTypes")
    .withIndex("by_site", (q) => q.eq("siteId", entry.siteId))
    .collect();
  const normalizedContentType = normalizePublishCascadeSchema<
    Id<"contentTypes">,
    typeof contentType
  >(contentType);
  const plan = resolvePublishCascadeTargets({
    schemas: siteContentTypes.map((schema) =>
      normalizePublishCascadeSchema<Id<"contentTypes">, typeof schema>(schema),
    ),
    root: {
      schema: normalizedContentType,
      includeRootIfDraft: true,
      useDraftFields: normalizedContentType.status === "draft",
    },
  });

  return {
    entry,
    contentType: normalizedContentType,
    cascadeTargets: plan.cascadeTargets as PublishPlanTarget[],
    expectedCascadeSlugs: plan.expectedCascadeSlugs,
  };
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
      ctx,
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
    draftId: v.optional(v.id("contentEntryDrafts")),
    cascade: v.optional(v.boolean()),
    expectedCascadeSlugs: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const plan = await getEntryPublishPlan(ctx, args.entryId);
    const { user } = await requireSiteAccess(ctx, plan.entry.siteId);
    const publishSource = await resolvePublishSource(
      ctx,
      plan.entry,
      args.draftId,
    );

    if (plan.cascadeTargets.length > 0 && !args.cascade) {
      throw new ConvexError(
        formatCascadePublishBlockedError(plan.cascadeTargets),
      );
    }

    if (args.cascade) {
      assertExpectedCascadeSlugs(
        args.expectedCascadeSlugs,
        plan.cascadeTargets,
      );
    }

    if (plan.cascadeTargets.length > 0) {
      await ctx.runMutation(internal.contentTypes.publishManyInternal, {
        contentTypeIds: plan.cascadeTargets
          .map((target) => target._id)
          .filter((targetId): targetId is Id<"contentTypes"> => !!targetId),
      });
    }

    const now = Date.now();

    await ctx.db.patch(args.entryId, {
      title: publishSource.title,
      draft: publishSource.draft,
      published: publishSource.draft,
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

    const [savedDrafts, routes] = await Promise.all([
      ctx.db
        .query("contentEntryDrafts")
        .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
        .collect(),
      ctx.db
        .query("contentEntryRoutes")
        .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
        .collect(),
    ]);

    for (const savedDraft of savedDrafts) {
      await ctx.db.delete(savedDraft._id);
    }

    for (const route of routes) {
      await ctx.db.delete(route._id);
    }

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

export const getPublishPlan = query({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const plan = await getEntryPublishPlan(ctx, args.entryId);
    await requireSiteAccess(ctx, plan.entry.siteId);

    return {
      cascadeTargets: formatPlanTargets(plan.cascadeTargets),
      expectedCascadeSlugs: plan.expectedCascadeSlugs,
    };
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
    expand: v.optional(v.array(v.literal("shopify"))),
    images: v.optional(v.literal("rich")),
  },
  handler: async (ctx, args) => {
    const contentType = normalizeContentType(
      await ctx.db.get(args.contentTypeId),
    );
    const fragments = await getPublishedSiteFragments(ctx, args.siteId);
    const entries = await ctx.db
      .query("contentEntries")
      .withIndex("by_type", (q) => q.eq("contentTypeId", args.contentTypeId))
      .collect();

    const publishedEntries = entries.filter(
      (entry) => entry.status === "published",
    );
    const shouldExpandShopify = args.expand?.includes("shopify") ?? false;
    const allAssetIds = publishedEntries.flatMap((entry) =>
      collectAssetIds(
        contentType?.fields ?? [],
        (entry.published as Record<string, unknown>) ?? {},
        fragments,
      ),
    );
    const assetContentMap = await buildAssetContentMap(
      ctx,
      args.siteId,
      allAssetIds,
      args.images,
    );
    const shopifyMaps = shouldExpandShopify
      ? await buildShopifyMaps(
          ctx,
          args.siteId,
          publishedEntries.reduce(
            (acc, entry) => {
              const handles = collectShopifyHandles(
                contentType?.fields ?? [],
                (entry.published as Record<string, unknown>) ?? {},
                fragments,
              );
              return {
                products: [...acc.products, ...handles.products],
                collections: [...acc.collections, ...handles.collections],
              };
            },
            { products: [] as string[], collections: [] as string[] },
          ),
        )
      : {
          products: new Map<string, unknown>(),
          collections: new Map<string, unknown>(),
        };

    return publishedEntries.map((entry) => {
      const content = (entry.published as Record<string, unknown>) ?? {};
      const resolvedContent = resolveAssetBackedEntryContent(
        contentType?.fields ?? [],
        content,
        assetContentMap,
        fragments,
      );

      return {
        slug: entry.slug,
        title: entry.title,
        ...resolveExpandedContent(
          contentType?.fields ?? [],
          resolvedContent,
          fragments,
          shopifyMaps.products,
          shopifyMaps.collections,
        ),
        _id: entry._id,
        _createdAt: entry.createdAt,
        _updatedAt: entry.updatedAt,
        _publishedAt: entry.publishedAt,
      };
    });
  },
});

export const getBySlugInternal = internalQuery({
  args: {
    siteId: v.id("sites"),
    contentTypeId: v.id("contentTypes"),
    slug: v.string(),
    preview: v.optional(v.boolean()),
    expand: v.optional(v.array(v.literal("shopify"))),
    images: v.optional(v.literal("rich")),
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
    const fragments = args.preview
      ? await getSiteFragments(ctx, args.siteId)
      : await getPublishedSiteFragments(ctx, args.siteId);
    const shouldExpandShopify = args.expand?.includes("shopify") ?? false;
    const allAssetIds = collectAssetIds(
      contentType?.fields ?? [],
      content,
      fragments,
    );
    const assetContentMap = await buildAssetContentMap(
      ctx,
      args.siteId,
      allAssetIds,
      args.images,
    );
    const shopifyMaps = shouldExpandShopify
      ? await buildShopifyMaps(
          ctx,
          args.siteId,
          collectShopifyHandles(contentType?.fields ?? [], content, fragments),
        )
      : {
          products: new Map<string, unknown>(),
          collections: new Map<string, unknown>(),
        };

    const resolvedContent = resolveAssetBackedEntryContent(
      contentType?.fields ?? [],
      content,
      assetContentMap,
      fragments,
    );

    return {
      slug: entry.slug,
      title: entry.title,
      ...resolveExpandedContent(
        contentType?.fields ?? [],
        resolvedContent,
        fragments,
        shopifyMaps.products,
        shopifyMaps.collections,
      ),
      _id: entry._id,
      _status: entry.status,
      _createdAt: entry.createdAt,
      _updatedAt: entry.updatedAt,
      _publishedAt: entry.publishedAt,
    };
  },
});
