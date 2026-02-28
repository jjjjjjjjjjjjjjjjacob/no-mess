import type {
  GetEntryOptions,
  NoMessClientConfig,
  NoMessEntry,
  PreviewExchangeResult,
  PreviewSessionAuth,
  SchemaGetResponse,
  SchemaListResponse,
  ShopifyCollection,
  ShopifyProduct,
} from "./types.js";
import { DEFAULT_API_URL, NoMessError } from "./types.js";

export class NoMessClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(config: NoMessClientConfig) {
    this.apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.apiKey = config.apiKey;

    if (
      typeof window !== "undefined" &&
      config.apiKey.startsWith("nm_") &&
      !config.apiKey.startsWith("nm_pub_")
    ) {
      console.warn(
        "[no-mess] You are using a secret API key (nm_) in a browser environment. " +
          "This exposes your secret key to end users. " +
          "Use a publishable key (nm_pub_) for client-side code instead.",
      );
    }
  }

  private async fetch<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new NoMessError(
        (body as { error?: string }).error ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all content type schemas with fields, TypeScript interfaces, and entry counts.
   */
  async getSchemas(): Promise<SchemaListResponse> {
    return this.fetch<SchemaListResponse>("/api/schema");
  }

  /**
   * Get a single content type schema by slug.
   */
  async getSchema(typeSlug: string): Promise<SchemaGetResponse> {
    return this.fetch<SchemaGetResponse>(`/api/schema/${typeSlug}`);
  }

  /**
   * Get all published entries of a content type.
   */
  async getEntries<T extends NoMessEntry = NoMessEntry>(
    contentType: string,
  ): Promise<T[]> {
    return this.fetch<T[]>(`/api/content/${contentType}`);
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
    return this.fetch<T>(`/api/content/${contentType}/${slug}`, params);
  }

  /**
   * Get all synced Shopify products.
   */
  async getProducts(): Promise<ShopifyProduct[]> {
    return this.fetch<ShopifyProduct[]>("/api/shopify/products");
  }

  /**
   * Get a single Shopify product by handle.
   */
  async getProduct(handle: string): Promise<ShopifyProduct> {
    return this.fetch<ShopifyProduct>(`/api/shopify/products/${handle}`);
  }

  /**
   * Get all synced Shopify collections.
   */
  async getCollections(): Promise<ShopifyCollection[]> {
    return this.fetch<ShopifyCollection[]>("/api/shopify/collections");
  }

  /**
   * Get a single Shopify collection by handle.
   */
  async getCollection(handle: string): Promise<ShopifyCollection> {
    return this.fetch<ShopifyCollection>(`/api/shopify/collections/${handle}`);
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

    const response = await fetch(`${this.apiUrl}/api/preview/exchange`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        timestamp,
        proof,
      }),
    });

    if (!response.ok) {
      const body = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new NoMessError(
        (body as { error?: string }).error ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<PreviewExchangeResult>;
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
    const secretBytes = new Uint8Array(
      (sessionSecret.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16)),
    );
    const buf = new ArrayBuffer(secretBytes.byteLength);
    new Uint8Array(buf).set(secretBytes);

    const key = await crypto.subtle.importKey(
      "raw",
      buf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const message = new TextEncoder().encode(`${sessionId}.${timestamp}`);
    const msgBuf = new ArrayBuffer(message.byteLength);
    new Uint8Array(msgBuf).set(message);

    const signature = await crypto.subtle.sign("HMAC", key, msgBuf);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }
}
