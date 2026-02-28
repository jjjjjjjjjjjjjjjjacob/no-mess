export { NoMessClient } from "./client.js";
export type { GetEntryOptions, NoMessClientConfig, NoMessEntry, PreviewExchangeResult, PreviewHandlerConfig, PreviewSessionAuth, ShopifyCollection, ShopifyProduct, UseNoMessPreviewConfig, UseNoMessPreviewResult, } from "./types.js";
export { DEFAULT_ADMIN_ORIGIN, DEFAULT_API_URL, NoMessError } from "./types.js";
import { NoMessClient } from "./client.js";
import type { NoMessClientConfig, PreviewHandlerConfig } from "./types.js";
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