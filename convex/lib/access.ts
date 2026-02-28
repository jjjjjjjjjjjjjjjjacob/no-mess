import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUser } from "./auth";

/**
 * Checks if the current user has access to the specified site.
 * Access is granted if the user is the site owner OR has a siteAccess record.
 * Returns the user, site, and role.
 * Throws ConvexError if not authorized.
 */
export async function requireSiteAccess(
  ctx: QueryCtx | MutationCtx,
  siteId: Id<"sites">,
) {
  const user = await getCurrentUser(ctx);
  const site = await ctx.db.get(siteId);

  if (!site) {
    throw new ConvexError("Site not found");
  }

  if (site.ownerId === user._id) {
    return { user, site, role: "owner" as const };
  }

  const access = await ctx.db
    .query("siteAccess")
    .withIndex("by_site_user", (q) =>
      q.eq("siteId", siteId).eq("userId", user._id),
    )
    .first();

  if (!access) {
    throw new ConvexError("You don't have access to this site");
  }

  return { user, site, role: access.role };
}

/**
 * Requires that the current user is the owner of the site.
 * Throws ConvexError if not the owner.
 */
export async function requireSiteOwner(
  ctx: QueryCtx | MutationCtx,
  siteId: Id<"sites">,
) {
  const result = await requireSiteAccess(ctx, siteId);
  if (result.role !== "owner") {
    throw new ConvexError("Only the site owner can perform this action");
  }
  return result;
}
