export const DEFAULT_API_URL = "https://api.no-mess.xyz";
export const DEFAULT_ADMIN_ORIGIN = "https://admin.no-mess.xyz";

export interface NoMessClientConfig {
  apiUrl?: string;
  /**
   * API key for authenticating requests to the no-mess API.
   * Accepts either a secret key (`nm_...`) or a publishable key (`nm_pub_...`).
   *
   * - **Secret key**: Server-side only. Full access. Never expose in client-side code.
   * - **Publishable key**: Safe for client-side use. Read-only access to published content.
   */
  apiKey: string;
}

/** Returns true if the key is a publishable key (nm_pub_ prefix). */
export function isPublishableKey(key: string): boolean {
  return key.startsWith("nm_pub_");
}

/** Returns true if the key is a secret key (nm_ prefix, not nm_pub_). */
export function isSecretKey(key: string): boolean {
  return key.startsWith("nm_") && !key.startsWith("nm_pub_");
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
  priceRange: { min: string; max: string };
  available: boolean;
  images?: { id: string; src: string; alt?: string }[];
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
    exchangePreviewSession: (
      session: PreviewSessionAuth,
    ) => Promise<PreviewExchangeResult>;
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

export interface ContentTypeSchema {
  name: string;
  slug: string;
  description?: string;
  fields: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
    options?: {
      choices?: { label: string; value: string }[];
    };
  }[];
  fieldTypeMap: {
    name: string;
    type: string;
    tsType: string;
    required: boolean;
  }[];
  typescript: string;
  entryCounts: {
    published: number;
    draft: number;
    total: number;
  };
  endpoints: {
    list: string;
    get: string;
  };
}

export interface SchemaListResponse {
  site: { name: string; slug: string };
  contentTypes: ContentTypeSchema[];
  sdkExample: string;
}

export interface SchemaGetResponse {
  site: { name: string; slug: string };
  contentType: ContentTypeSchema;
  sdkExample: string;
}

// --- Live Edit types ---

export interface LiveEditFieldInfo {
  name: string;
  type: string;
  required: boolean;
}

export interface LiveEditConfig {
  adminOrigin: string;
  onFieldClicked?: (fieldName: string) => void;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface LiveEditHandle {
  cleanup: () => void;
}

export interface UseNoMessLiveEditConfig {
  adminOrigin?: string;
}

export interface UseNoMessLiveEditResult {
  isLiveEditActive: boolean;
  fieldOverrides: Record<string, unknown>;
}

export class NoMessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NoMessError";
    this.status = status;
  }
}
