import type { ActionCtx } from "../_generated/server";

export type ApiKeyType = "publishable" | "secret";

/**
 * Classifies an API key by its prefix.
 * - `nm_pub_` → "publishable" (safe for client-side, read-only)
 * - `nm_` (without `pub_`) → "secret" (server-side only)
 * - Anything else → null (invalid)
 */
export function classifyApiKey(key: string): ApiKeyType | null {
  if (key.startsWith("nm_pub_")) return "publishable";
  if (key.startsWith("nm_")) return "secret";
  return null;
}

/**
 * Extracts and validates an API key from the request Authorization header.
 * Returns the site associated with the API key and the key type, or null if invalid.
 */
export async function validateApiKey(
  ctx: ActionCtx,
  request: Request,
): Promise<{
  site: {
    _id: string;
    slug: string;
    name: string;
    previewSecret: string;
    [key: string]: unknown;
  };
  keyType: ApiKeyType;
} | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  const apiKey = parts[1];
  if (!apiKey) return null;

  const keyType = classifyApiKey(apiKey);
  if (!keyType) return null;

  const { internal } = await import("../_generated/api");

  let site: unknown;
  if (keyType === "publishable") {
    site = await ctx.runQuery(internal.sites.getByPublishableKey, {
      publishableKey: apiKey,
    });
  } else {
    site = await ctx.runQuery(internal.sites.getByApiKey, { apiKey });
  }

  if (!site) return null;

  return {
    site: site as {
      _id: string;
      slug: string;
      name: string;
      previewSecret: string;
      [key: string]: unknown;
    },
    keyType,
  };
}
