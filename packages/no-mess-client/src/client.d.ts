import type { GetEntryOptions, NoMessClientConfig, NoMessEntry, PreviewExchangeResult, PreviewSessionAuth, ShopifyCollection, ShopifyProduct } from "./types.js";
export declare class NoMessClient {
    private apiUrl;
    private apiKey;
    constructor(config: NoMessClientConfig);
    private fetch;
    /**
     * Get all published entries of a content type.
     */
    getEntries<T extends NoMessEntry = NoMessEntry>(contentType: string): Promise<T[]>;
    /**
     * Get a single entry by content type and slug.
     * Supports preview mode with preview secret.
     */
    getEntry<T extends NoMessEntry = NoMessEntry>(contentType: string, slug: string, options?: GetEntryOptions): Promise<T>;
    /**
     * Get all synced Shopify products.
     */
    getProducts(): Promise<ShopifyProduct[]>;
    /**
     * Get a single Shopify product by handle.
     */
    getProduct(handle: string): Promise<ShopifyProduct>;
    /**
     * Get all synced Shopify collections.
     */
    getCollections(): Promise<ShopifyCollection[]>;
    /**
     * Get a single Shopify collection by handle.
     */
    getCollection(handle: string): Promise<ShopifyCollection>;
    /**
     * Exchange a preview session for draft content.
     * Computes an HMAC-SHA256 proof and sends it to the server for verification.
     */
    exchangePreviewSession(session: PreviewSessionAuth): Promise<PreviewExchangeResult>;
    /**
     * Compute HMAC-SHA256 proof for preview session authentication.
     * Uses Web Crypto API (works in browsers, Node.js 18+, Deno, Bun, edge runtimes).
     */
    private computeProof;
}
//# sourceMappingURL=client.d.ts.map