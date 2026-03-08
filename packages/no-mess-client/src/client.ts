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
  GetEntryOptions,
  NoMessClientConfig,
  NoMessEntry,
  NoMessErrorCode,
  NoMessLogLevel,
  PreviewExchangeResult,
  PreviewSessionAuth,
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
  operation: string;
}

export class NoMessClient {
  private apiUrl: string;
  private apiKey: string;
  private logger: ReturnType<typeof createSdkLogger>;

  constructor(config: NoMessClientConfig) {
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.apiKey = config.apiKey;
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
    operation,
  }: RequestOptions): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const requestUrl = url.toString();
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

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
    const text = await this.readResponseText(response, operation, method, requestUrl);

    if (!response.ok) {
      const parsed = text.trim() ? safeParseJsonText(text) : null;
      const parsedBody =
        parsed && parsed.ok && parsed.value && typeof parsed.value === "object"
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
      const error = createNoMessResponseError("Received invalid JSON response", {
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
      });
      this.emitErrorLog(error, "client", operation);
      throw error;
    }

    return parsed.value as T;
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
  ): Promise<T[]> {
    return this.request<T[]>({
      method: "GET",
      path: `/api/content/${contentType}`,
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
    const params: Record<string, string> = {};
    if (options?.preview) {
      params.preview = "true";
      if (options.previewSecret) {
        params.secret = options.previewSecret;
      }
    }

    return this.request<T>({
      method: "GET",
      path: `/api/content/${contentType}/${slug}`,
      params,
      operation: "getEntry",
    });
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
   * Compute HMAC-SHA256 proof for preview session authentication.
   * Uses Web Crypto API (works in browsers, Node.js 18+, Deno, Bun, edge runtimes).
   */
  private async computeProof(
    sessionSecret: string,
    sessionId: string,
    timestamp: string,
  ): Promise<string> {
    if (!sessionSecret || sessionSecret.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(sessionSecret)) {
      const error = createNoMessCryptoError("Preview session secret must be a valid hex string", {
        kind: "crypto",
        code: "invalid_session_secret",
        operation: "computeProof",
        details: {
          sessionId,
        },
      });
      this.emitErrorLog(error, "client", "computeProof");
      throw error;
    }

    if (typeof crypto === "undefined" || !crypto.subtle) {
      const error = createNoMessCryptoError("Web Crypto API is not available in this runtime", {
        kind: "crypto",
        code: "crypto_unavailable",
        operation: "computeProof",
        details: {
          sessionId,
        },
      });
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
      const normalized = createNoMessCryptoError("Failed to initialize preview proof signing key", {
        kind: "crypto",
        code: "invalid_session_secret",
        operation: "computeProof",
        details: {
          sessionId,
        },
        cause: error,
      });
      this.emitErrorLog(normalized, "client", "computeProof");
      throw normalized;
    }

    const message = new TextEncoder().encode(`${sessionId}.${timestamp}`);

    try {
      const signature = await crypto.subtle.sign("HMAC", key, message);
      return this.toBase64(new Uint8Array(signature));
    } catch (error) {
      const normalized = createNoMessCryptoError("Failed to sign preview proof", {
        kind: "crypto",
        code: "crypto_unavailable",
        operation: "computeProof",
        details: {
          sessionId,
        },
        cause: error,
      });
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
