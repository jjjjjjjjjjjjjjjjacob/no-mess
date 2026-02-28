export { NoMessClient } from "./client.js";
export { createLiveEditHandler } from "./live-edit.js";
export type {
  ContentTypeSchema,
  GetEntryOptions,
  LiveEditConfig,
  LiveEditHandle,
  NoMessClientConfig,
  NoMessEntry,
  PreviewExchangeResult,
  PreviewHandlerConfig,
  PreviewSessionAuth,
  SchemaGetResponse,
  SchemaListResponse,
  ShopifyCollection,
  ShopifyProduct,
  UseNoMessLiveEditConfig,
  UseNoMessLiveEditResult,
  UseNoMessPreviewConfig,
  UseNoMessPreviewResult,
} from "./types.js";
export {
  DEFAULT_ADMIN_ORIGIN,
  DEFAULT_API_URL,
  isPublishableKey,
  isSecretKey,
  NoMessError,
} from "./types.js";

import { NoMessClient } from "./client.js";
import type {
  NoMessClientConfig,
  NoMessEntry,
  PreviewHandlerConfig,
  PreviewSessionAuth,
} from "./types.js";

/**
 * Create a no-mess client instance.
 */
export function createNoMessClient(config: NoMessClientConfig): NoMessClient {
  return new NoMessClient(config);
}

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
export function createPreviewHandler(config: PreviewHandlerConfig): {
  start: () => void;
  cleanup: () => void;
} {
  let sessionAuth: PreviewSessionAuth | null = null;

  const handleMessage = async (event: MessageEvent) => {
    if (event.origin !== config.adminOrigin) return;

    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "no-mess:session-auth") {
      sessionAuth = {
        sessionId: data.sessionId,
        sessionSecret: data.sessionSecret,
      };
      try {
        const result = await config.client.exchangePreviewSession(sessionAuth);
        config.onEntry(result.entry as NoMessEntry);
        window.parent.postMessage(
          { type: "no-mess:preview-loaded" },
          event.origin,
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        config.onError?.(error);
        window.parent.postMessage(
          { type: "no-mess:preview-error", error: error.message },
          event.origin,
        );
      }
    }

    if (data.type === "no-mess:refresh" && sessionAuth) {
      try {
        const result = await config.client.exchangePreviewSession(sessionAuth);
        config.onEntry(result.entry as NoMessEntry);
        window.parent.postMessage(
          { type: "no-mess:preview-loaded" },
          event.origin,
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        config.onError?.(error);
        window.parent.postMessage(
          { type: "no-mess:preview-error", error: error.message },
          event.origin,
        );
      }
    }
  };

  return {
    start: () => {
      window.addEventListener("message", handleMessage);
      window.parent.postMessage({ type: "no-mess:preview-ready" }, "*");
    },
    cleanup: () => {
      window.removeEventListener("message", handleMessage);
    },
  };
}
