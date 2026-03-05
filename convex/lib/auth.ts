import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Gets the currently authenticated user from the Convex database.
 * Resolves the Clerk identity to a Convex user document via the by_clerk index.
 * Throws ConvexError if not authenticated or user not found.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new ConvexError("User not found in database");
  }

  if (user.deletedAt) {
    throw new ConvexError("Account has been deleted");
  }

  return user;
}

/**
 * Gets the currently authenticated user, or returns null if not authenticated.
 */
export async function getCurrentUserOrNull(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (user?.deletedAt) {
    return null;
  }

  return user;
}
