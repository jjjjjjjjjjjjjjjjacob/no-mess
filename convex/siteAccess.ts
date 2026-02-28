import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireSiteAccess, requireSiteOwner } from "./lib/access";

export const invite = mutation({
  args: {
    siteId: v.id("sites"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireSiteOwner(ctx, args.siteId);

    const invitedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!invitedUser) {
      throw new ConvexError("User with this email not found");
    }

    const existingAccess = await ctx.db
      .query("siteAccess")
      .withIndex("by_site_user", (q) =>
        q.eq("siteId", args.siteId).eq("userId", invitedUser._id),
      )
      .first();

    if (existingAccess) {
      throw new ConvexError("User already has access to this site");
    }

    const site = await ctx.db.get(args.siteId);
    if (site && site.ownerId === invitedUser._id) {
      throw new ConvexError("User is already the owner of this site");
    }

    return await ctx.db.insert("siteAccess", {
      siteId: args.siteId,
      userId: invitedUser._id,
      role: "editor",
      invitedBy: currentUser._id,
      invitedAt: Date.now(),
    });
  },
});

export const removeAccess = mutation({
  args: {
    siteAccessId: v.id("siteAccess"),
  },
  handler: async (ctx, args) => {
    const access = await ctx.db.get(args.siteAccessId);

    if (!access) {
      throw new ConvexError("Access record not found");
    }

    await requireSiteOwner(ctx, access.siteId);
    await ctx.db.delete(args.siteAccessId);
  },
});

export const listBySite = query({
  args: {
    siteId: v.id("sites"),
  },
  handler: async (ctx, args) => {
    await requireSiteAccess(ctx, args.siteId);

    const accessRecords = await ctx.db
      .query("siteAccess")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return await Promise.all(
      accessRecords.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          user: user
            ? {
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      }),
    );
  },
});
