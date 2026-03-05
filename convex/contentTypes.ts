import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireSiteAccess, requireSiteOwner } from "./lib/access";
import { contentFieldsValidator, fieldTypeValidator } from "./lib/validators";

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    fields: contentFieldsValidator,
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const existing = await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", args.slug),
      )
      .first();

    if (existing) {
      throw new ConvexError(
        "A content type with this slug already exists for this site",
      );
    }

    const fieldNames = args.fields.map((f) => f.name);
    if (new Set(fieldNames).size !== fieldNames.length) {
      throw new ConvexError("Field names must be unique within a content type");
    }

    const contentTypeId = await ctx.db.insert("contentTypes", {
      siteId: args.siteId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      fields: args.fields,
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
    description: v.optional(v.string()),
    fields: v.optional(contentFieldsValidator),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    await requireSiteAccess(ctx, contentType.siteId);

    if (args.slug !== undefined) {
      const slugToCheck = args.slug;
      const existing = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", contentType.siteId).eq("slug", slugToCheck),
        )
        .first();

      if (existing && existing._id !== args.contentTypeId) {
        throw new ConvexError(
          "A content type with this slug already exists for this site",
        );
      }
    }

    if (args.fields !== undefined) {
      const fieldNames = args.fields.map((f) => f.name);
      if (new Set(fieldNames).size !== fieldNames.length) {
        throw new ConvexError(
          "Field names must be unique within a content type",
        );
      }
    }

    const fields: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) fields.name = args.name;
    if (args.slug !== undefined) fields.slug = args.slug;
    if (args.description !== undefined) fields.description = args.description;
    if (args.fields !== undefined) fields.fields = args.fields;

    await ctx.db.patch(args.contentTypeId, fields);
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

    await requireSiteOwner(ctx, contentType.siteId);

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

    await requireSiteAccess(ctx, contentType.siteId);

    return contentType;
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

    return contentTypes.map((ct) => {
      const { draft: _draft, ...rest } = ct;
      return {
        ...rest,
        status: (ct.status ?? "published") as "draft" | "published",
        hasDraft: ct.draft !== undefined,
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

    return await ctx.db
      .query("contentTypes")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", args.siteId).eq("slug", args.slug),
      )
      .first();
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
    for (let i = 1; i <= 10 && suggestions.length < 3; i++) {
      const candidate = `${args.slug}-${i}`;
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

/**
 * Internal query to list all published content types for a site.
 * Used by the schema introspection HTTP API.
 */
export const listBySiteInternal = internalQuery({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const contentTypes = await ctx.db
      .query("contentTypes")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    // Only return published content types (exclude draft-only schemas)
    return contentTypes.filter((ct) => ct.status !== "draft");
  },
});

/**
 * Internal query to get a content type by site ID and slug.
 * Used by the HTTP API. Returns null for draft-only schemas.
 */
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

    if (!contentType) return null;

    // Never serve draft-only schemas via the public API
    if (contentType.status === "draft") return null;

    return contentType;
  },
});

export const createDraft = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(contentFieldsValidator),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const name = args.name?.trim() || "Untitled Schema";
    const slug = args.slug?.trim() || "";
    const fields = args.fields ?? [];

    // Check slug uniqueness if provided
    if (slug) {
      const existing = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", args.siteId).eq("slug", slug),
        )
        .first();

      if (existing) {
        throw new ConvexError(
          "A content type with this slug already exists for this site",
        );
      }
    }

    const now = Date.now();
    const draftData = {
      name,
      slug,
      description: args.description?.trim() || undefined,
      fields,
    };

    const contentTypeId = await ctx.db.insert("contentTypes", {
      siteId: args.siteId,
      name,
      slug,
      description: draftData.description,
      fields,
      status: "draft",
      draft: draftData,
      draftUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return contentTypeId;
  },
});

export const saveDraft = mutation({
  args: {
    contentTypeId: v.id("contentTypes"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    fields: v.optional(contentFieldsValidator),
  },
  handler: async (ctx, args) => {
    const contentType = await ctx.db.get(args.contentTypeId);
    if (!contentType) {
      throw new ConvexError("Content type not found");
    }

    await requireSiteAccess(ctx, contentType.siteId);

    const currentDraft = (contentType.draft as Record<string, unknown>) ?? {};
    const draftData = {
      name:
        args.name?.trim() ?? (currentDraft.name as string) ?? contentType.name,
      slug:
        args.slug?.trim() ?? (currentDraft.slug as string) ?? contentType.slug,
      description:
        args.description !== undefined
          ? args.description?.trim() || undefined
          : ((currentDraft.description as string | undefined) ??
            contentType.description),
      fields:
        args.fields ??
        (currentDraft.fields as typeof contentType.fields) ??
        contentType.fields,
    };

    const now = Date.now();
    const status = contentType.status ?? "published";

    if (status === "draft") {
      // Draft-only schema: update both top-level and draft fields
      // Check slug uniqueness if slug is changing
      if (draftData.slug && draftData.slug !== contentType.slug) {
        const existing = await ctx.db
          .query("contentTypes")
          .withIndex("by_slug", (q) =>
            q.eq("siteId", contentType.siteId).eq("slug", draftData.slug),
          )
          .first();

        if (existing && existing._id !== args.contentTypeId) {
          throw new ConvexError(
            "A content type with this slug already exists for this site",
          );
        }
      }

      await ctx.db.patch(args.contentTypeId, {
        name: draftData.name,
        slug: draftData.slug,
        description: draftData.description,
        fields: draftData.fields,
        draft: draftData,
        draftUpdatedAt: now,
        updatedAt: now,
      });
    } else {
      // Published schema: only update draft field, leave published data untouched
      await ctx.db.patch(args.contentTypeId, {
        draft: draftData,
        draftUpdatedAt: now,
        updatedAt: now,
      });
    }
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

    await requireSiteAccess(ctx, contentType.siteId);

    // Use draft data if available, otherwise use top-level fields
    const draft = contentType.draft as
      | {
          name?: string;
          slug?: string;
          description?: string;
          fields?: typeof contentType.fields;
        }
      | undefined;

    const name = draft?.name ?? contentType.name;
    const slug = draft?.slug ?? contentType.slug;
    const description = draft?.description ?? contentType.description;
    const fields = draft?.fields ?? contentType.fields;

    // Full validation
    if (!name?.trim()) {
      throw new ConvexError("Name is required to publish");
    }
    if (!slug?.trim()) {
      throw new ConvexError("Slug is required to publish");
    }
    if (!fields || fields.length === 0) {
      throw new ConvexError("At least one field is required to publish");
    }

    const fieldNames = fields.map((f) => f.name.trim().toLowerCase());
    if (new Set(fieldNames).size !== fieldNames.length) {
      throw new ConvexError("Field names must be unique within a content type");
    }

    // Check slug uniqueness
    if (slug !== contentType.slug) {
      const existing = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", contentType.siteId).eq("slug", slug),
        )
        .first();

      if (existing && existing._id !== args.contentTypeId) {
        throw new ConvexError(
          "A content type with this slug already exists for this site",
        );
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.contentTypeId, {
      name: name.trim(),
      slug: slug.trim(),
      description: description?.trim() || undefined,
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

    await requireSiteAccess(ctx, contentType.siteId);

    const status = contentType.status ?? "published";
    if (status === "draft") {
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

/**
 * Internal mutation used by the schema sync HTTP endpoint and CLI.
 * For each content type definition in the payload:
 *   - If slug exists: update as draft (merge, never delete existing fields)
 *   - If slug doesn't exist: create as draft
 * Never deletes content types or fields not in the payload.
 */
export const syncFromSchema = internalMutation({
  args: {
    siteId: v.id("sites"),
    contentTypes: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        fields: v.array(
          v.object({
            name: v.string(),
            type: fieldTypeValidator,
            required: v.boolean(),
            description: v.optional(v.string()),
            options: v.optional(
              v.object({
                choices: v.optional(
                  v.array(
                    v.object({
                      label: v.string(),
                      value: v.string(),
                    }),
                  ),
                ),
              }),
            ),
          }),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const results: { slug: string; action: "created" | "updated" }[] = [];

    for (const incoming of args.contentTypes) {
      const existing = await ctx.db
        .query("contentTypes")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", args.siteId).eq("slug", incoming.slug),
        )
        .first();

      if (existing) {
        // Merge fields: keep existing fields not in the import, update matching ones
        const existingFieldMap = new Map(
          existing.fields.map((f) => [f.name, f]),
        );
        for (const incomingField of incoming.fields) {
          existingFieldMap.set(incomingField.name, incomingField);
        }
        const mergedFields = Array.from(existingFieldMap.values());

        const draftData = {
          name: incoming.name,
          slug: incoming.slug,
          description: incoming.description,
          fields: mergedFields,
        };

        const now = Date.now();
        const status = existing.status ?? "published";

        if (status === "draft") {
          await ctx.db.patch(existing._id, {
            name: draftData.name,
            slug: draftData.slug,
            description: draftData.description,
            fields: draftData.fields,
            draft: draftData,
            draftUpdatedAt: now,
            updatedAt: now,
          });
        } else {
          await ctx.db.patch(existing._id, {
            draft: draftData,
            draftUpdatedAt: now,
            updatedAt: now,
          });
        }

        results.push({ slug: incoming.slug, action: "updated" });
      } else {
        // Create new draft content type
        const now = Date.now();
        const draftData = {
          name: incoming.name,
          slug: incoming.slug,
          description: incoming.description,
          fields: incoming.fields,
        };

        await ctx.db.insert("contentTypes", {
          siteId: args.siteId,
          name: incoming.name,
          slug: incoming.slug,
          description: incoming.description,
          fields: incoming.fields,
          status: "draft",
          draft: draftData,
          draftUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        results.push({ slug: incoming.slug, action: "created" });
      }
    }

    return results;
  },
});
