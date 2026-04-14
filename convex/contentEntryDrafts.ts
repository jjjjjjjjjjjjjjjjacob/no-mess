import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requireSiteAccess } from "./lib/access";

function normalizeDraftName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ConvexError("Draft name is required");
  }

  return {
    value: trimmed,
    lower: trimmed.toLocaleLowerCase(),
  };
}

async function getEntryForMutation(
  ctx: MutationCtx,
  entryId: Id<"contentEntries">,
) {
  const entry = await ctx.db.get(entryId);
  if (!entry) {
    throw new ConvexError("Content entry not found");
  }

  const access = await requireSiteAccess(ctx, entry.siteId);
  return { entry, ...access };
}

async function ensureUniqueDraftName(
  ctx: MutationCtx,
  entryId: Id<"contentEntries">,
  nameLower: string,
  excludeDraftId?: Id<"contentEntryDrafts">,
) {
  const existing = await ctx.db
    .query("contentEntryDrafts")
    .withIndex("by_entry_name_lower", (q) =>
      q.eq("entryId", entryId).eq("nameLower", nameLower),
    )
    .first();

  if (existing && existing._id !== excludeDraftId) {
    throw new ConvexError("A saved draft with this name already exists");
  }
}

export const listByEntry = query({
  args: {
    entryId: v.id("contentEntries"),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await requireSiteAccess(ctx, entry.siteId);

    const drafts = await ctx.db
      .query("contentEntryDrafts")
      .withIndex("by_entry", (q) => q.eq("entryId", args.entryId))
      .collect();

    return drafts.sort((left, right) => {
      return (
        right.updatedAt - left.updatedAt || right.createdAt - left.createdAt
      );
    });
  },
});

export const create = mutation({
  args: {
    entryId: v.id("contentEntries"),
    name: v.string(),
    title: v.string(),
    draft: v.any(),
  },
  handler: async (ctx, args) => {
    const { entry, user } = await getEntryForMutation(ctx, args.entryId);
    const name = normalizeDraftName(args.name);
    await ensureUniqueDraftName(ctx, entry._id, name.lower);

    const now = Date.now();
    return await ctx.db.insert("contentEntryDrafts", {
      siteId: entry.siteId,
      entryId: entry._id,
      name: name.value,
      nameLower: name.lower,
      title: args.title,
      draft: args.draft,
      createdAt: now,
      createdBy: user._id,
      updatedAt: now,
      updatedBy: user._id,
    });
  },
});

export const rename = mutation({
  args: {
    draftId: v.id("contentEntryDrafts"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const savedDraft = await ctx.db.get(args.draftId);
    if (!savedDraft) {
      throw new ConvexError("Saved draft not found");
    }

    const { user } = await requireSiteAccess(ctx, savedDraft.siteId);
    const name = normalizeDraftName(args.name);
    await ensureUniqueDraftName(
      ctx,
      savedDraft.entryId,
      name.lower,
      savedDraft._id,
    );

    await ctx.db.patch(savedDraft._id, {
      name: name.value,
      nameLower: name.lower,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });
  },
});

export const remove = mutation({
  args: {
    draftId: v.id("contentEntryDrafts"),
  },
  handler: async (ctx, args) => {
    const savedDraft = await ctx.db.get(args.draftId);
    if (!savedDraft) {
      throw new ConvexError("Saved draft not found");
    }

    await requireSiteAccess(ctx, savedDraft.siteId);
    await ctx.db.delete(savedDraft._id);
  },
});

export const load = mutation({
  args: {
    draftId: v.id("contentEntryDrafts"),
  },
  handler: async (ctx, args) => {
    const savedDraft = await ctx.db.get(args.draftId);
    if (!savedDraft) {
      throw new ConvexError("Saved draft not found");
    }

    const { user } = await requireSiteAccess(ctx, savedDraft.siteId);
    const entry = await ctx.db.get(savedDraft.entryId);
    if (!entry) {
      throw new ConvexError("Content entry not found");
    }

    await ctx.db.patch(entry._id, {
      title: savedDraft.title,
      draft: savedDraft.draft,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return {
      entryId: entry._id,
      title: savedDraft.title,
      draft: savedDraft.draft,
    };
  },
});
