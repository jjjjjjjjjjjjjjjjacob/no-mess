export const DEFAULT_API_URL = "https://api.nomess.xyz";
export const DEFAULT_ADMIN_ORIGIN = "https://admin.no-mess.xyz";

export type NoMessErrorKind =
  | "config"
  | "network"
  | "http"
  | "response"
  | "crypto"
  | "protocol"
  | "runtime";

export type NoMessErrorCode =
  | "secret_key_in_browser"
  | "missing_configuration"
  | "multiple_singleton_entries"
  | "request_failed"
  | "http_error"
  | "invalid_success_response"
  | "invalid_error_response"
  | "crypto_unavailable"
  | "invalid_session_secret"
  | "preview_message_invalid"
  | "preview_exchange_failed"
  | "preview_postmessage_failed"
  | "live_edit_runtime_failed";

export type NoMessLogLevel = "debug" | "info" | "warn" | "error";

export interface NoMessLogEvent {
  level: NoMessLogLevel;
  code: NoMessErrorCode;
  message: string;
  scope: string;
  operation?: string;
  error?: NoMessError;
  timestamp: string;
  context: Record<string, unknown>;
}

export type NoMessLogger = (event: NoMessLogEvent) => void;

export interface NoMessErrorOptions {
  kind?: NoMessErrorKind;
  code?: NoMessErrorCode;
  status?: number;
  retryable?: boolean;
  operation?: string;
  method?: string;
  url?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export interface NoMessNextFetchOptions {
  revalidate?: number | false;
  tags?: string[];
}

export type NoMessFetchOptions = Omit<RequestInit, "method" | "body"> & {
  next?: NoMessNextFetchOptions;
};

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
  fetch?: NoMessFetchOptions;
  fresh?: boolean;
  logger?: NoMessLogger;
}

/** Returns true if the key is a publishable key (nm_pub_ prefix). */
export function isPublishableKey(key: string): boolean {
  return key.startsWith("nm_pub_");
}

/** Returns true if the key is a secret key (nm_ prefix, not nm_pub_). */
export function isSecretKey(key: string): boolean {
  return key.startsWith("nm_") && !key.startsWith("nm_pub_");
}

export type ContentExpandTarget = "shopify";
export type ContentImageMode = "rich";

export interface NoMessImageVariant {
  url: string;
  width: number;
  height: number;
}

export interface NoMessImage {
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
  originalUrl?: string;
  originalMimeType?: string;
  variants?: NoMessImageVariant[];
}

export interface GetEntriesOptions {
  expand?: ContentExpandTarget[];
  images?: ContentImageMode;
  fetch?: NoMessFetchOptions;
  fresh?: boolean;
}

export interface GetEntryOptions extends GetEntriesOptions {
  preview?: boolean;
  previewSecret?: string;
}

export type ShopifyProductRef = string | { handle: string };
export type ShopifyCollectionRef = string | { handle: string };

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

/** Report a delivery URL for route-aware Live Edit. */
export interface ReportLiveEditRouteOptions {
  entryId: string;
  url?: string;
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
  logger?: NoMessLogger;
}

export interface UseNoMessPreviewConfig {
  apiKey: string;
  apiUrl?: string;
  adminOrigin?: string;
  logger?: NoMessLogger;
}

export type UseNoMessPreviewStatus =
  | "waiting-for-admin"
  | "exchanging-session"
  | "ready"
  | "error";

export interface UseNoMessPreviewResult<T extends NoMessEntry = NoMessEntry> {
  entry: T | null;
  error: Error | null;
  errorDetails: NoMessError | null;
  isLoading: boolean;
  status: UseNoMessPreviewStatus;
}

export interface ContentTypeSchema {
  name: string;
  slug: string;
  kind?: "template" | "fragment";
  mode?: "singleton" | "collection";
  route?: string;
  description?: string;
  fields: import("./schema/schema-types.js").NamedFieldDefinition[];
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

// --- Provider types ---

/** Props for the route-aware provider used on real site routes. */
export interface NoMessLiveRouteProviderProps extends UseNoMessPreviewConfig {
  children: import("react").ReactNode;
  liveEditConfig?: UseNoMessLiveEditConfig;
}

/** Backward-compatible alias for the route-aware provider props. */
export interface NoMessProviderProps extends NoMessLiveRouteProviderProps {}

/** Options for binding a rendered entry to the current route. */
export interface UseNoMessEditableEntryOptions {
  registerCurrentUrl?: boolean;
  url?: string;
}

/** Shared provider context for preview/live-edit state. */
export interface NoMessContextValue {
  adminOrigin: string;
  apiKey: string;
  apiUrl?: string;
  bindEntry: (entryId: string) => void;
  client: Pick<import("./client.js").NoMessClient, "reportLiveEditRoute">;
  isIframe: boolean;
  preview: UseNoMessPreviewResult;
  liveEdit: UseNoMessLiveEditResult;
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
  onError?: (error: Error) => void;
  logger?: NoMessLogger;
}

export interface LiveEditHandle {
  cleanup: () => void;
}

export interface UseNoMessLiveEditConfig {
  adminOrigin?: string;
  logger?: NoMessLogger;
}

export interface UseNoMessLiveEditResult {
  isLiveEditActive: boolean;
  fieldOverrides: Record<string, unknown>;
  error: Error | null;
  errorDetails: NoMessError | null;
}

export class NoMessError extends Error {
  readonly kind: NoMessErrorKind;
  readonly code: NoMessErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly operation?: string;
  readonly method?: string;
  readonly url?: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
  readonly cause?: unknown;

  constructor(message: string, status: number);
  constructor(message: string, options?: NoMessErrorOptions);
  constructor(message: string, statusOrOptions?: number | NoMessErrorOptions) {
    const options =
      typeof statusOrOptions === "number"
        ? { status: statusOrOptions }
        : (statusOrOptions ?? {});
    const formattedMessage =
      typeof options.status === "number" &&
      !message.endsWith(`(HTTP ${options.status})`)
        ? `${message} (HTTP ${options.status})`
        : message;

    super(formattedMessage);
    this.name = "NoMessError";
    this.kind = options.kind ?? "runtime";
    this.code = options.code ?? "live_edit_runtime_failed";
    this.status = options.status;
    this.retryable =
      options.retryable ??
      (typeof options.status === "number" && options.status >= 500);
    this.operation = options.operation;
    this.method = options.method;
    this.url = options.url;
    this.requestId = options.requestId;
    this.details = options.details;
    this.cause = options.cause;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
