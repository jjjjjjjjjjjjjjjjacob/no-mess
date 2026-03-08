export declare const DEFAULT_API_URL = "https://api.nomess.xyz";
export declare const DEFAULT_ADMIN_ORIGIN = "https://admin.no-mess.xyz";
export interface NoMessClientConfig {
    apiUrl?: string;
    apiKey: string;
}
export interface GetEntryOptions {
    preview?: boolean;
    previewSecret?: string;
}
export interface NoMessEntry {
    slug: string;
    title: string;
    _id: string;
    _createdAt: number;
    _updatedAt: number;
    _publishedAt?: number;
    _status?: string;
    [key: string]: unknown;
}
export interface ShopifyProduct {
    handle: string;
    title: string;
    status: string;
    featuredImage?: string;
    priceRange: {
        min: string;
        max: string;
    };
    available: boolean;
    images?: {
        id: string;
        src: string;
        alt?: string;
    }[];
    variants?: {
        id: string;
        title: string;
        sku?: string;
        price: string;
        compareAtPrice?: string;
        available: boolean;
    }[];
    productType?: string;
    vendor?: string;
    tags?: string[];
}
export interface ShopifyCollection {
    handle: string;
    title: string;
    image?: string;
    productsCount: number;
}
export interface PreviewSessionAuth {
    sessionId: string;
    sessionSecret: string;
}
export interface PreviewExchangeResult {
    entry: NoMessEntry;
    sessionId: string;
    expiresAt: number;
}
export interface PreviewHandlerConfig {
    client: {
        exchangePreviewSession: (session: PreviewSessionAuth) => Promise<PreviewExchangeResult>;
    };
    adminOrigin: string;
    onEntry: (entry: NoMessEntry) => void;
    onError?: (error: Error) => void;
}
export interface UseNoMessPreviewConfig {
    apiKey: string;
    apiUrl?: string;
    adminOrigin?: string;
}
export interface UseNoMessPreviewResult<T extends NoMessEntry = NoMessEntry> {
    entry: T | null;
    error: Error | null;
    isLoading: boolean;
}
export declare class NoMessError extends Error {
    status: number;
    constructor(message: string, status: number);
}
//# sourceMappingURL=types.d.ts.map