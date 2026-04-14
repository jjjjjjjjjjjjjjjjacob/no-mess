import {
  createNoMessCryptoError,
  createNoMessHttpError,
  createNoMessResponseError,
  extractRequestId,
  normalizeNoMessError,
  safeParseJsonText,
} from "./error-utils.js";
import { createSdkLogger, warnOnce } from "./logging.js";
import type {
  ContentExpandTarget,
  GetEntriesOptions,
  GetEntryOptions,
  NoMessClientConfig,
  NoMessEntry,
  NoMessFetchOptions,
  NoMessLogLevel,
  NoMessNextFetchOptions,
  PreviewExchangeResult,
  PreviewSessionAuth,
  ReportLiveEditRouteOptions,
  SchemaGetResponse,
  SchemaListResponse,
  ShopifyCollection,
  ShopifyProduct,
} from "./types.js";
import { DEFAULT_API_URL, NoMessError } from "./types.js";

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  fetch?: NoMessFetchOptions;
  fresh?: boolean;
  forceFresh?: boolean;
  operation: string;
}

const CONTENT_EXPAND_TARGETS = new Set<ContentExpandTarget>(["shopify"]);
const FRESH_REQUEST_PARAM = "fresh";
const NO_CACHE_VALUE = "no-store";

type InternalRequestInit = RequestInit & {
  next?: NoMessNextFetchOptions;
};

function normalizeExpandTargets(
  expand?: ContentExpandTarget[],
): ContentExpandTarget[] {
  if (!expand) {
    return [];
  }

  const targets = new Set<ContentExpandTarget>();
  for (const target of expand) {
    if (typeof target !== "string") {
      continue;
    }

    const normalized = target.trim() as ContentExpandTarget;
    if (CONTENT_EXPAND_TARGETS.has(normalized)) {
      targets.add(normalized);
    }
  }

  return [...targets];
}

function compareEntriesForSingleton(
  left: NoMessEntry,
  right: NoMessEntry,
): number {
  const leftPublished = left._publishedAt ?? -1;
  const rightPublished = right._publishedAt ?? -1;
  if (leftPublished !== rightPublished) {
    return rightPublished - leftPublished;
  }

  if (left._createdAt !== right._createdAt) {
    return right._createdAt - left._createdAt;
  }

  return right.slug.localeCompare(left.slug);
}

export class NoMessClient {
  private apiUrl: string;
  private apiKey: string;
  private defaultFetch?: NoMessFetchOptions;
  private fresh?: boolean;
  private logger: ReturnType<typeof createSdkLogger>;

  constructor(config: NoMessClientConfig) {
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.defaultFetch = config.fetch;
    this.fresh = config.fresh;
    this.logger = createSdkLogger(config.logger);

    if (
      typeof window !== "undefined" &&
      config.apiKey.startsWith("nm_") &&
      !config.apiKey.startsWith("nm_pub_")
    ) {
      warnOnce(this.logger, "secret-key-in-browser", {
        level: "warn",
        code: "secret_key_in_browser",
        message:
          "You are using a secret API key (nm_) in a browser environment. This exposes your secret key to end users. Use a publishable key (nm_pub_) for client-side code instead.",
        scope: "client",
        operation: "constructor",
        timestamp: new Date().toISOString(),
        context: {
          apiUrl: this.apiUrl,
        },
      });
    }
  }

  private mergeFetchOptions(
    defaults?: NoMessFetchOptions,
    overrides?: NoMessFetchOptions,
  ): NoMessFetchOptions | undefined {
    if (!defaults && !overrides) {
      return undefined;
    }

    const mergedHeaders = this.mergeHeaders(
      defaults?.headers,
      overrides?.headers,
    );
    const mergedNext =
      defaults?.next || overrides?.next
        ? {
            ...(defaults?.next ?? {}),
            ...(overrides?.next ?? {}),
          }
        : undefined;

    const merged: NoMessFetchOptions = {
      ...(defaults ?? {}),
      ...(overrides ?? {}),
    };

    if (mergedHeaders) {
      merged.headers = mergedHeaders;
    } else {
      delete merged.headers;
    }

    if (mergedNext) {
      merged.next = mergedNext;
    } else {
      delete merged.next;
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private mergeHeaders(
    defaults?: HeadersInit,
    overrides?: HeadersInit,
  ): Headers | undefined {
    if (!defaults && !overrides) {
      return undefined;
    }

    const merged = new Headers(defaults);
    if (overrides) {
      const overrideHeaders = new Headers(overrides);
      for (const [key, value] of overrideHeaders.entries()) {
        merged.set(key, value);
      }
    }

    return merged;
  }

  private shouldUseFreshMode(
    fetchOptions: NoMessFetchOptions | undefined,
    fresh: boolean | undefined,
    forceFresh: boolean,
  ): boolean {
    if (forceFresh) {
      return true;
    }

    if (typeof fresh === "boolean") {
      return fresh;
    }

    if (typeof this.fresh === "boolean") {
      return this.fresh;
    }

    if (fetchOptions?.cache === NO_CACHE_VALUE) {
      return true;
    }

    if (fetchOptions?.next?.revalidate === 0) {
      return true;
    }

    return false;
  }

  private emitErrorLog(
    error: NoMessError,
    scope: string,
    operation: string,
    level: NoMessLogLevel = "error",
    extraContext?: Record<string, unknown>,
  ) {
    this.logger({
      level,
      code: error.code,
      message: error.message,
      scope,
      operation,
      error,
      timestamp: new Date().toISOString(),
      context: {
        status: error.status,
        retryable: error.retryable,
        requestId: error.requestId,
        ...error.details,
        ...extraContext,
      },
    });
  }

  private async readResponseText(
    response: Response,
    operation: string,
    method: string,
    url: string,
  ): Promise<string> {
    try {
      if (typeof response.text === "function") {
        return await response.text();
      }

      if (typeof response.json === "function") {
        return JSON.stringify(await response.json());
      }
    } catch (error) {
      throw createNoMessResponseError("Failed to read response body", {
        kind: "response",
        code: "invalid_success_response",
        operation,
        method,
        url,
        requestId: extractRequestId(response),
        cause: error,
      });
    }

    return "";
  }

  private async request<T>({
    method,
    path,
    params,
    body,
    fetch: fetchOptions,
    fresh,
    forceFresh = false,
    operation,
  }: RequestOptions): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    const requestFetchOptions =
      method === "GET"
        ? this.mergeFetchOptions(this.defaultFetch, fetchOptions)
        : undefined;
    const isFreshRequest = this.shouldUseFreshMode(
      requestFetchOptions,
      fresh,
      forceFresh,
    );

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    if (isFreshRequest) {
      url.searchParams.set(FRESH_REQUEST_PARAM, "true");
    }

    const requestUrl = url.toString();
    const init: InternalRequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (requestFetchOptions) {
      Object.assign(init, requestFetchOptions);
      const mergedHeaders = this.mergeHeaders(
        {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        requestFetchOptions.headers,
      );
      if (mergedHeaders) {
        init.headers = mergedHeaders;
      }
    }

    if (typeof body !== "undefined") {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(requestUrl, init);
    } catch (error) {
      const normalized = normalizeNoMessError(error, {
        kind: "network",
        code: "request_failed",
        operation,
        method,
        url: requestUrl,
        retryable: true,
      });
      this.emitErrorLog(normalized, "client", operation);
      throw normalized;
    }

    const requestId = extractRequestId(response);
    const text = await this.readResponseText(
      response,
      operation,
      method,
      requestUrl,
    );

    if (!response.ok) {
      const parsed = text.trim() ? safeParseJsonText(text) : null;
      const parsedBody =
        parsed?.ok && parsed.value && typeof parsed.value === "object"
          ? (parsed.value as { error?: unknown })
          : null;
      const message =
        typeof parsedBody?.error === "string" && parsedBody.error.trim()
          ? parsedBody.error
          : text.trim() || `HTTP ${response.status}`;

      const error = createNoMessHttpError(message, {
        kind: "http",
        code: "http_error",
        status: response.status,
        operation,
        method,
        url: requestUrl,
        requestId,
        retryable: response.status >= 500,
      });
      this.emitErrorLog(error, "client", operation);
      throw error;
    }

    const parsed = safeParseJsonText(text);
    if (!parsed.ok) {
      const error = createNoMessResponseError(
        "Received invalid JSON response",
        {
          kind: "response",
          code: "invalid_success_response",
          operation,
          method,
          url: requestUrl,
          requestId,
          details: {
            responseText: text.slice(0, 200),
          },
          cause: parsed.error,
        },
      );
      this.emitErrorLog(error, "client", operation);
      throw error;
    }

    return parsed.value as T;
  }

  private buildContentParams(
    options?: GetEntriesOptions | GetEntryOptions,
  ): Record<string, string> | undefined {
    const params: Record<string, string> = {};
    const expand = normalizeExpandTargets(options?.expand);
    if (expand.length > 0) {
      params.expand = expand.join(",");
    }

    if (options?.images === "rich") {
      params.images = "rich";
    }

    const entryOptions = options as GetEntryOptions | undefined;
    if (entryOptions?.preview) {
      params.preview = "true";
      if (entryOptions.previewSecret) {
        params.secret = entryOptions.previewSecret;
      }
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  /**
   * List all content type schemas with fields, TypeScript interfaces, and entry counts.
   */
  async getSchemas(): Promise<SchemaListResponse> {
    return this.request<SchemaListResponse>({
      method: "GET",
      path: "/api/schema",
      operation: "getSchemas",
    });
  }

  /**
   * Get a single content type schema by slug.
   */
  async getSchema(typeSlug: string): Promise<SchemaGetResponse> {
    return this.request<SchemaGetResponse>({
      method: "GET",
      path: `/api/schema/${typeSlug}`,
      operation: "getSchema",
    });
  }

  /**
   * Get all published entries of a content type.
   */
  async getEntries<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
    options?: GetEntriesOptions,
  ): Promise<T[]> {
    return this.request<T[]>({
      method: "GET",
      path: `/api/content/${contentType}`,
      params: this.buildContentParams(options),
      fetch: options?.fetch,
      fresh: options?.fresh,
      operation: "getEntries",
    });
  }

  /**
   * Get a single entry by content type and slug.
   * Supports preview mode with preview secret.
   */
  async getEntry<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
    slug: string,
    options?: GetEntryOptions,
  ): Promise<T> {
    return this.request<T>({
      method: "GET",
      path: `/api/content/${contentType}/${slug}`,
      params: this.buildContentParams(options),
      fetch: options?.fetch,
      fresh: options?.fresh,
      forceFresh: options?.preview === true,
      operation: "getEntry",
    });
  }

  async getEntryOrNull<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
    slug: string,
    options?: GetEntryOptions,
  ): Promise<T | null> {
    try {
      return await this.getEntry<T>(contentType, slug, options);
    } catch (error) {
      if (error instanceof NoMessError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getSingleton<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
    options?: GetEntriesOptions,
  ): Promise<T | null> {
    try {
      const entries = await this.getEntries<T>(contentType, options);
      if (entries.length === 0) {
        return null;
      }

      const sortedEntries = [...entries].sort(compareEntriesForSingleton);
      const chosenEntry = sortedEntries[0];

      if (sortedEntries.length > 1) {
        warnOnce(this.logger, `multiple-singleton-entries:${contentType}`, {
          level: "warn",
          code: "multiple_singleton_entries",
          message:
            `Content type "${contentType}" is being fetched as a singleton, but multiple published entries were returned. ` +
            `Using "${chosenEntry.slug}".`,
          scope: "client",
          operation: "getSingleton",
          timestamp: new Date().toISOString(),
          context: {
            contentType,
            chosenSlug: chosenEntry.slug,
            slugs: sortedEntries.map((entry) => entry.slug),
          },
        });
      }

      return chosenEntry;
    } catch (error) {
      if (error instanceof NoMessError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getRequiredSingleton<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
    options?: GetEntriesOptions,
  ): Promise<T> {
    const entry = await this.getSingleton<T>(contentType, options);
    if (entry) {
      return entry;
    }

    throw createNoMessHttpError(
      `Singleton entry for "${contentType}" not found`,
      {
        kind: "http",
        code: "http_error",
        status: 404,
        retryable: false,
        operation: "getRequiredSingleton",
        method: "GET",
        url: `${this.apiUrl}/api/content/${contentType}`,
      },
    );
  }

  /**
   * Get all synced Shopify products.
   */
  async getProducts(): Promise<ShopifyProduct[]> {
    return this.request<ShopifyProduct[]>({
      method: "GET",
      path: "/api/shopify/products",
      operation: "getProducts",
    });
  }

  /**
   * Get a single Shopify product by handle.
   */
  async getProduct(handle: string): Promise<ShopifyProduct> {
    return this.request<ShopifyProduct>({
      method: "GET",
      path: `/api/shopify/products/${handle}`,
      operation: "getProduct",
    });
  }

  /**
   * Get all synced Shopify collections.
   */
  async getCollections(): Promise<ShopifyCollection[]> {
    return this.request<ShopifyCollection[]>({
      method: "GET",
      path: "/api/shopify/collections",
      operation: "getCollections",
    });
  }

  /**
   * Get a single Shopify collection by handle.
   */
  async getCollection(handle: string): Promise<ShopifyCollection> {
    return this.request<ShopifyCollection>({
      method: "GET",
      path: `/api/shopify/collections/${handle}`,
      operation: "getCollection",
    });
  }

  /**
   * Exchange a preview session for draft content.
   * Computes an HMAC-SHA256 proof and sends it to the server for verification.
   */
  async exchangePreviewSession(
    session: PreviewSessionAuth,
  ): Promise<PreviewExchangeResult> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const proof = await this.computeProof(
      session.sessionSecret,
      session.sessionId,
      timestamp,
    );

    return this.request<PreviewExchangeResult>({
      method: "POST",
      path: "/api/preview/exchange",
      operation: "exchangePreviewSession",
      body: {
        sessionId: session.sessionId,
        timestamp,
        proof,
      },
    });
  }

  /**
   * Report that an entry is rendered on the current site URL for route-aware live edit.
   */
  async reportLiveEditRoute(
    options: ReportLiveEditRouteOptions,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>({
      method: "POST",
      path: "/api/live-edit/routes/report",
      operation: "reportLiveEditRoute",
      body: options,
    });
  }

  /**
   * Compute HMAC-SHA256 proof for preview session authentication.
   * Uses Web Crypto API (works in browsers, Node.js 18+, Deno, Bun, edge runtimes).
   */
  private async computeProof(
    sessionSecret: string,
    sessionId: string,
    timestamp: string,
  ): Promise<string> {
    if (
      !sessionSecret ||
      sessionSecret.length % 2 !== 0 ||
      !/^[0-9a-fA-F]+$/.test(sessionSecret)
    ) {
      const error = createNoMessCryptoError(
        "Preview session secret must be a valid hex string",
        {
          kind: "crypto",
          code: "invalid_session_secret",
          operation: "computeProof",
          details: {
            sessionId,
          },
        },
      );
      this.emitErrorLog(error, "client", "computeProof");
      throw error;
    }

    if (typeof crypto === "undefined" || !crypto.subtle) {
      const error = createNoMessCryptoError(
        "Web Crypto API is not available in this runtime",
        {
          kind: "crypto",
          code: "crypto_unavailable",
          operation: "computeProof",
          details: {
            sessionId,
          },
        },
      );
      this.emitErrorLog(error, "client", "computeProof");
      throw error;
    }

    const secretBytes = new Uint8Array(
      (sessionSecret.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)),
    );

    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    } catch (error) {
      const normalized = createNoMessCryptoError(
        "Failed to initialize preview proof signing key",
        {
          kind: "crypto",
          code: "invalid_session_secret",
          operation: "computeProof",
          details: {
            sessionId,
          },
          cause: error,
        },
      );
      this.emitErrorLog(normalized, "client", "computeProof");
      throw normalized;
    }

    const message = new TextEncoder().encode(`${sessionId}.${timestamp}`);

    try {
      const signature = await crypto.subtle.sign("HMAC", key, message);
      return this.toBase64(new Uint8Array(signature));
    } catch (error) {
      const normalized = createNoMessCryptoError(
        "Failed to sign preview proof",
        {
          kind: "crypto",
          code: "crypto_unavailable",
          operation: "computeProof",
          details: {
            sessionId,
          },
          cause: error,
        },
      );
      this.emitErrorLog(normalized, "client", "computeProof");
      throw normalized;
    }
  }

  private toBase64(bytes: Uint8Array): string {
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let output = "";

    for (let index = 0; index < bytes.length; index += 3) {
      const a = bytes[index] ?? 0;
      const b = bytes[index + 1] ?? 0;
      const c = bytes[index + 2] ?? 0;
      const chunk = (a << 16) | (b << 8) | c;

      output += alphabet[(chunk >> 18) & 0x3f];
      output += alphabet[(chunk >> 12) & 0x3f];
      output += index + 1 < bytes.length ? alphabet[(chunk >> 6) & 0x3f] : "=";
      output += index + 2 < bytes.length ? alphabet[chunk & 0x3f] : "=";
    }

    return output;
  }
}
