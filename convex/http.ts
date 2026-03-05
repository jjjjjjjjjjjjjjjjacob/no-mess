import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/webhooks/clerk",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    // Verify webhook signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // Verify webhook signature using Web Crypto API
    // (svix npm package requires Node.js crypto, unavailable in Convex runtime)
    let payload: {
      type: string;
      data: {
        id: string;
        email_addresses?: { email_address: string }[];
        first_name?: string | null;
        last_name?: string | null;
        image_url?: string | null;
      };
    };

    try {
      // Decode the secret (strip "whsec_" prefix, base64-decode)
      const secretBase64 = webhookSecret.startsWith("whsec_")
        ? webhookSecret.slice(6)
        : webhookSecret;
      const secretBytes = Uint8Array.from(atob(secretBase64), (c) =>
        c.charCodeAt(0),
      );

      // Reject stale timestamps (>5 min)
      const ts = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Number.isNaN(ts) || Math.abs(now - ts) > 300) {
        return new Response("Invalid timestamp", { status: 400 });
      }

      // Compute HMAC-SHA256
      const toSign = `${svixId}.${svixTimestamp}.${body}`;
      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(toSign),
      );
      const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

      // Compare against provided signatures (may contain multiple, space-separated)
      const signatures = svixSignature
        .split(" ")
        .map((s) => s.replace(/^v\d+,/, ""));
      if (!signatures.some((s) => s === expected)) {
        throw new Error("No matching signature");
      }

      payload = JSON.parse(body);
    } catch {
      console.error("Webhook verification failed");
      return new Response("Invalid signature", { status: 400 });
    }

    const eventType = payload.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        payload.data;

      const email = email_addresses?.[0]?.email_address ?? "";
      const name =
        [first_name, last_name].filter(Boolean).join(" ") || "Unnamed";

      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: id,
        email,
        name,
        avatarUrl: image_url ?? undefined,
      });
    }

    if (eventType === "user.deleted") {
      const { id } = payload.data;
      await ctx.runMutation(internal.userDeletion.softDeleteUser, {
        clerkId: id,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

// ============================================================
// Public Content Delivery API
// ============================================================

/**
 * Helper: Extract and validate API key from Authorization header.
 * Supports both secret (`nm_`) and publishable (`nm_pub_`) keys.
 *
 * @param requiredKeyType - "secret" to reject publishable keys, "any" to accept both (default: "any")
 */
async function authenticateRequest(
  ctx: {
    runQuery: (
      // biome-ignore lint/suspicious/noExplicitAny: Supports both getByApiKey and getByPublishableKey internal queries
      query: any,
      args: Record<string, string>,
    ) => Promise<unknown>;
  },
  request: Request,
  requiredKeyType: "secret" | "any" = "any",
): Promise<
  | { error: Response }
  | { site: { _id: string; previewSecret: string; [key: string]: unknown } }
> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return { error: corsJsonError("Missing Authorization header", 401) };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return { error: corsJsonError("Invalid Authorization format", 401) };
  }

  const apiKey = parts[1];
  if (!apiKey) {
    return { error: corsJsonError("Invalid API key format", 401) };
  }

  const { classifyApiKey } = await import("./lib/apiAuth");
  const keyType = classifyApiKey(apiKey);

  if (!keyType) {
    return { error: corsJsonError("Invalid API key format", 401) };
  }

  if (requiredKeyType === "secret" && keyType === "publishable") {
    return {
      error: corsJsonError(
        "This endpoint requires a secret key. Publishable keys are not allowed.",
        403,
      ),
    };
  }

  let site: unknown;
  if (keyType === "publishable") {
    site = await ctx.runQuery(internal.sites.getByPublishableKey, {
      publishableKey: apiKey,
    });
  } else {
    site = await ctx.runQuery(internal.sites.getByApiKey, { apiKey });
  }

  if (!site) {
    return { error: corsJsonError("Invalid API key", 401) };
  }

  return {
    site: site as {
      _id: string;
      previewSecret: string;
      [key: string]: unknown;
    },
  };
}

function corsJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}

function corsJsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function corsJsonResponseNoCache(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

// CORS preflight for all content API routes
http.route({
  pathPrefix: "/api/content/",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// GET /api/content/:type — List published entries of a content type
http.route({
  pathPrefix: "/api/content/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if ("error" in auth) return auth.error;
    const { site } = auth;

    const url = new URL(request.url);
    const pathParts = url.pathname
      .replace("/api/content/", "")
      .split("/")
      .filter(Boolean);

    if (pathParts.length === 0) {
      return corsJsonError("Content type slug required", 400);
    }

    const typeSlug = pathParts[0];
    const entrySlug = pathParts[1]; // undefined if listing

    // Look up content type
    const contentType = await ctx.runQuery(
      internal.contentTypes.getBySlugInternal,
      // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
      { siteId: site._id as any, slug: typeSlug },
    );

    if (!contentType) {
      return corsJsonError(`Content type "${typeSlug}" not found`, 404);
    }

    if (entrySlug) {
      // Single entry
      const preview = url.searchParams.get("preview") === "true";
      const secret = url.searchParams.get("secret");

      const isPreview = preview && secret === site.previewSecret;

      const entry = await ctx.runQuery(
        internal.contentEntries.getBySlugInternal,
        {
          // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
          siteId: site._id as any,
          // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
          contentTypeId: contentType._id as any,
          slug: entrySlug,
          preview: isPreview,
        },
      );

      if (!entry) {
        return corsJsonError(`Entry "${entrySlug}" not found`, 404);
      }

      return corsJsonResponse(entry);
    }

    // List entries
    const entries = await ctx.runQuery(
      internal.contentEntries.listPublishedByType,
      {
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
        contentTypeId: contentType._id as any,
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
        siteId: site._id as any,
      },
    );

    return corsJsonResponse(entries);
  }),
});

// ============================================================
// Schema Introspection API
// ============================================================

// CORS preflight for schema routes
http.route({
  path: "/api/schema",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

http.route({
  pathPrefix: "/api/schema/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// POST /api/schema/sync — Push schema definitions from CLI / dashboard import
http.route({
  path: "/api/schema/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Require secret key (not publishable)
    const auth = await authenticateRequest(ctx, request, "secret");
    if ("error" in auth) return auth.error;
    const { site } = auth;

    let body: {
      contentTypes?: {
        slug: string;
        name: string;
        description?: string;
        fields: {
          name: string;
          type: string;
          required: boolean;
          description?: string;
          options?: { choices?: { label: string; value: string }[] };
        }[];
      }[];
    };

    try {
      body = await request.json();
    } catch {
      return corsJsonError("Invalid JSON body", 400);
    }

    if (typeof body !== "object" || body === null) {
      return corsJsonError("Invalid request body", 400);
    }

    if (!body.contentTypes || !Array.isArray(body.contentTypes)) {
      return corsJsonError(
        "Missing or invalid contentTypes array in request body",
        400,
      );
    }

    if (body.contentTypes.length === 0) {
      return corsJsonError("contentTypes array must not be empty", 400);
    }

    // Validate each content type has required fields
    const validationErrors: string[] = [];
    for (const ct of body.contentTypes) {
      if (!ct.slug || typeof ct.slug !== "string") {
        validationErrors.push("Each content type must have a slug");
      }
      if (!ct.name || typeof ct.name !== "string") {
        validationErrors.push(
          `Content type "${ct.slug ?? "unknown"}" must have a name`,
        );
      }
      if (!Array.isArray(ct.fields)) {
        validationErrors.push(
          `Content type "${ct.slug ?? "unknown"}" must have a fields array`,
        );
      }
    }

    if (validationErrors.length > 0) {
      return corsJsonError(validationErrors.join("; "), 400);
    }

    try {
      const results = await ctx.runMutation(
        internal.contentTypes.syncFromSchema,
        {
          // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
          siteId: site._id as any,
          // biome-ignore lint/suspicious/noExplicitAny: Convex field type coercion
          contentTypes: body.contentTypes as any,
        },
      );

      return corsJsonResponseNoCache({
        synced: results,
        errors: [],
      });
    } catch (err) {
      console.error("Schema sync failed:", err);
      return corsJsonError("Internal server error", 500);
    }
  }),
});

// Schema introspection handler (shared by exact and prefix routes)
const schemaHandler = httpAction(async (ctx, request) => {
  const auth = await authenticateRequest(ctx, request);
  if ("error" in auth) return auth.error;
  const { site } = auth;

  const { generateFieldTypeMap, generateTypeScriptInterface } = await import(
    "./lib/schemaIntrospection"
  );

  const url = new URL(request.url);
  const pathParts = url.pathname
    .replace("/api/schema", "")
    .split("/")
    .filter(Boolean);

  const typeSlug = pathParts[0]; // undefined if listing all

  // Fetch all published content types for the site
  const contentTypes = await ctx.runQuery(
    internal.contentTypes.listBySiteInternal,
    // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
    { siteId: site._id as any },
  );

  // If a specific type slug was requested, filter to just that one
  const targetTypes = typeSlug
    ? contentTypes.filter((ct: { slug: string }) => ct.slug === typeSlug)
    : contentTypes;

  if (typeSlug && targetTypes.length === 0) {
    return corsJsonError(`Content type "${typeSlug}" not found`, 404);
  }

  // Build schema data for each content type
  const schemaData = await Promise.all(
    targetTypes.map(
      async (ct: {
        _id: string;
        name: string;
        slug: string;
        description?: string;
        fields: {
          name: string;
          type: string;
          required: boolean;
          description?: string;
          options?: { choices?: { label: string; value: string }[] };
        }[];
      }) => {
        const counts = await ctx.runQuery(
          internal.contentEntries.countByTypeInternal,
          {
            // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
            siteId: site._id as any,
            // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
            contentTypeId: ct._id as any,
          },
        );

        return {
          name: ct.name,
          slug: ct.slug,
          description: ct.description,
          fields: ct.fields,
          // biome-ignore lint/suspicious/noExplicitAny: Convex widens field type union to string
          fieldTypeMap: generateFieldTypeMap(ct.fields as any),
          // biome-ignore lint/suspicious/noExplicitAny: Convex widens field type union to string
          typescript: generateTypeScriptInterface(ct.name, ct.fields as any),
          entryCounts: counts,
          endpoints: {
            list: `/api/content/${ct.slug}`,
            get: `/api/content/${ct.slug}/{slug}`,
          },
        };
      },
    ),
  );

  const siteName = (site as { name?: string }).name ?? "";
  const siteSlug = (site as { slug?: string }).slug ?? "";

  const sdkExample = `import { createNoMessClient } from '@no-mess/client';

const client = createNoMessClient({ apiKey: 'nm_...' });

// List all schemas
const { contentTypes } = await client.getSchemas();

// Get entries
const entries = await client.getEntries('${schemaData[0]?.slug ?? "your-type"}');`;

  // Single type: return the type directly
  if (typeSlug) {
    return corsJsonResponse({
      site: { name: siteName, slug: siteSlug },
      contentType: schemaData[0],
      sdkExample,
    });
  }

  // List: return all types
  return corsJsonResponse({
    site: { name: siteName, slug: siteSlug },
    contentTypes: schemaData,
    sdkExample,
  });
});

// GET /api/schema — List all content type schemas
http.route({
  path: "/api/schema",
  method: "GET",
  handler: schemaHandler,
});

// GET /api/schema/:typeSlug — Get a single content type schema
http.route({
  pathPrefix: "/api/schema/",
  method: "GET",
  handler: schemaHandler,
});

// CORS preflight for Shopify routes
http.route({
  pathPrefix: "/api/shopify/",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// Shopify API routes
http.route({
  pathPrefix: "/api/shopify/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await authenticateRequest(ctx, request);
    if ("error" in auth) return auth.error;
    const { site } = auth;

    const url = new URL(request.url);
    const pathParts = url.pathname
      .replace("/api/shopify/", "")
      .split("/")
      .filter(Boolean);

    if (pathParts.length === 0) {
      return corsJsonError(
        "Resource type required (products or collections)",
        400,
      );
    }

    const resource = pathParts[0]; // "products" or "collections"
    const handle = pathParts[1]; // optional handle

    if (resource === "products") {
      if (handle) {
        const product = await ctx.runQuery(
          internal.shopify.getProductByHandleInternal,
          // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
          { siteId: site._id as any, handle },
        );
        if (!product) {
          return corsJsonError(`Product "${handle}" not found`, 404);
        }
        return corsJsonResponse(product);
      }

      const products = await ctx.runQuery(
        internal.shopify.listProductsInternal,
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
        { siteId: site._id as any },
      );
      return corsJsonResponse(products);
    }

    if (resource === "collections") {
      if (handle) {
        const collection = await ctx.runQuery(
          internal.shopify.getCollectionByHandleInternal,
          // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
          { siteId: site._id as any, handle },
        );
        if (!collection) {
          return corsJsonError(`Collection "${handle}" not found`, 404);
        }
        return corsJsonResponse(collection);
      }

      const collections = await ctx.runQuery(
        internal.shopify.listCollectionsInternal,
        // biome-ignore lint/suspicious/noExplicitAny: Convex ID type coercion
        { siteId: site._id as any },
      );
      return corsJsonResponse(collections);
    }

    return corsJsonError(`Unknown Shopify resource "${resource}"`, 400);
  }),
});

// ============================================================
// Preview Session Exchange API
// ============================================================

// CORS preflight for preview exchange
http.route({
  path: "/api/preview/exchange",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// POST /api/preview/exchange — Exchange a preview session for draft content
http.route({
  path: "/api/preview/exchange",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Authenticate API key
    const auth = await authenticateRequest(ctx, request);
    if ("error" in auth) return auth.error;
    const { site } = auth;

    // 2. Parse request body
    let body: { sessionId?: string; timestamp?: string; proof?: string };
    try {
      body = await request.json();
    } catch {
      return corsJsonError("Invalid JSON body", 400);
    }

    const { sessionId, timestamp, proof } = body;
    if (!sessionId || !timestamp || !proof) {
      return corsJsonError(
        "Missing required fields: sessionId, timestamp, proof",
        400,
      );
    }

    // 3. Look up valid session
    const session = await ctx.runQuery(
      internal.previewSessions.getValidSession,
      { sessionId },
    );

    if (!session) {
      return corsJsonError("Invalid or expired preview session", 401);
    }

    // 4. Verify session belongs to the authenticated site
    if (session.siteId !== site._id) {
      return corsJsonError("Session does not match API key", 401);
    }

    // 5. Verify HMAC proof
    const { verifyProof } = await import("./lib/previewCrypto");
    const isValid = await verifyProof(
      session.sessionSecret,
      sessionId,
      timestamp,
      proof,
    );

    if (!isValid) {
      return corsJsonError("Invalid proof or stale timestamp", 401);
    }

    // 6. Look up the content type to get the entry
    const entry = await ctx.runQuery(internal.contentEntries.getByIdInternal, {
      entryId: session.entryId,
    });

    if (!entry) {
      return corsJsonError("Preview entry not found", 404);
    }

    // 7. Mark session as used
    await ctx.runMutation(internal.previewSessions.markSessionUsed, {
      sessionId,
    });

    // 8. Return draft content (no caching)
    return corsJsonResponseNoCache({
      entry,
      sessionId,
      expiresAt: session.expiresAt,
    });
  }),
});

export default http;
