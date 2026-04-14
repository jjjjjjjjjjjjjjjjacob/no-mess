export { NoMessClient } from "./client.js";
export { createLiveEditHandler } from "./live-edit.js";
export { getShopifyHandle, isShopifyCollectionRef, isShopifyProductRef, } from "./reference-utils.js";
export type { ContentExpandTarget, ContentImageMode, ContentTypeSchema, GetEntriesOptions, GetEntryOptions, LiveEditConfig, LiveEditHandle, NoMessClientConfig, NoMessEntry, NoMessErrorCode, NoMessErrorKind, NoMessImage, NoMessImageVariant, NoMessErrorOptions, NoMessFetchOptions, NoMessLiveRouteProviderProps, NoMessLogEvent, NoMessLogger, NoMessLogLevel, NoMessNextFetchOptions, NoMessProviderProps, PreviewExchangeResult, PreviewHandlerConfig, PreviewSessionAuth, ReportLiveEditRouteOptions, SchemaGetResponse, SchemaListResponse, ShopifyCollection, ShopifyCollectionRef, ShopifyProduct, ShopifyProductRef, UseNoMessEditableEntryOptions, UseNoMessLiveEditConfig, UseNoMessLiveEditResult, UseNoMessPreviewConfig, UseNoMessPreviewResult, UseNoMessPreviewStatus, } from "./types.js";
export { DEFAULT_ADMIN_ORIGIN, DEFAULT_API_URL, isPublishableKey, isSecretKey, NoMessError, } from "./types.js";
import { NoMessClient } from "./client.js";
import type { NoMessClientConfig, NoMessImage, PreviewHandlerConfig } from "./types.js";
/**
 * Build an HTML srcset string from a NoMessImage returned by the `?images=rich` API.
 * The full-resolution URL is always included as the largest source.
 *
 * @example
 * ```ts
 * const entries = await client.getEntries("pages", { images: "rich" });
 * const hero = entries[0].heroImage as NoMessImage;
 * // <img src={hero.url} srcSet={buildSrcSet(hero)} sizes="100vw" />
 * ```
 */
export declare function buildSrcSet(image: NoMessImage): string;
/**
 * Create a no-mess client instance.
 */
export declare function createNoMessClient(config: NoMessClientConfig): NoMessClient;
/**
 * Create a preview handler that manages the postMessage handshake
 * between the admin dashboard (parent) and the preview iframe (child).
 *
 * Usage in a client site's preview page:
 * ```ts
 * const handler = createPreviewHandler({
 *   client,
 *   adminOrigin: "https://admin.no-mess.xyz",
 *   onEntry: (entry) => setEntry(entry),
 *   onError: (err) => setError(err.message),
 * });
 * handler.start();
 * // On cleanup: handler.cleanup();
 * ```
 */
export declare function createPreviewHandler(config: PreviewHandlerConfig): {
    start: () => void;
    cleanup: () => void;
};
//# sourceMappingURL=index.d.ts.map
