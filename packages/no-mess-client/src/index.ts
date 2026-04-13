export { NoMessClient } from "./client.js";
export { createLiveEditHandler } from "./live-edit.js";
export {
  getShopifyHandle,
  isShopifyCollectionRef,
  isShopifyProductRef,
} from "./reference-utils.js";
export type {
  ContentExpandTarget,
  ContentImageMode,
  ContentTypeSchema,
  GetEntriesOptions,
  GetEntryOptions,
  LiveEditConfig,
  LiveEditHandle,
  NoMessClientConfig,
  NoMessEntry,
  NoMessErrorCode,
  NoMessErrorKind,
  NoMessImage,
  NoMessImageVariant,
  NoMessErrorOptions,
  NoMessFetchOptions,
  NoMessLiveRouteProviderProps,
  NoMessLogEvent,
  NoMessLogger,
  NoMessLogLevel,
  NoMessNextFetchOptions,
  NoMessProviderProps,
  PreviewExchangeResult,
  PreviewHandlerConfig,
  PreviewSessionAuth,
  ReportLiveEditRouteOptions,
  SchemaGetResponse,
  SchemaListResponse,
  ShopifyCollection,
  ShopifyCollectionRef,
  ShopifyProduct,
  ShopifyProductRef,
  UseNoMessEditableEntryOptions,
  UseNoMessLiveEditConfig,
  UseNoMessLiveEditResult,
  UseNoMessPreviewConfig,
  UseNoMessPreviewResult,
  UseNoMessPreviewStatus,
} from "./types.js";
export {
  DEFAULT_ADMIN_ORIGIN,
  DEFAULT_API_URL,
  isPublishableKey,
  isSecretKey,
  NoMessError,
} from "./types.js";

import { NoMessClient } from "./client.js";
import {
  createNoMessProtocolError,
  normalizeNoMessError,
} from "./error-utils.js";
import { createSdkLogger } from "./logging.js";
import type {
  NoMessClientConfig,
  NoMessEntry,
  NoMessErrorCode,
  NoMessImage,
  PreviewHandlerConfig,
  PreviewSessionAuth,
} from "./types.js";

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
export function buildSrcSet(image: NoMessImage): string {
  const sources = (image.variants ?? []).map(
    (v) => `${v.url} ${v.width}w`,
  );
  if (image.width) {
    sources.push(`${image.url} ${image.width}w`);
  } else {
    sources.push(image.url);
  }
  return sources.join(", ");
}

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
  const logger = createSdkLogger(config.logger);
  let sessionAuth: PreviewSessionAuth | null = null;
  let disposed = false;
  let inFlightRequestId = 0;
  let latestCompletedRequestId = 0;

  const logEvent = (
    level: "debug" | "warn" | "error",
    code: NoMessErrorCode,
    message: string,
    context: Record<string, unknown>,
    error?: Error,
  ) => {
    logger({
      level,
      code,
      message,
      scope: "preview",
      operation: "createPreviewHandler",
      error: error instanceof Error ? (error as never) : undefined,
      timestamp: new Date().toISOString(),
      context,
    });
  };

  const invokeOnError = (error: Error) => {
    try {
      config.onError?.(error);
    } catch (callbackError) {
      logEvent(
        "error",
        "preview_exchange_failed",
        "Preview onError callback threw unexpectedly",
        {},
        normalizeNoMessError(callbackError, {
          kind: "runtime",
          code: "preview_exchange_failed",
          operation: "preview.onError",
        }),
      );
    }
  };

  const postToParent = (
    message: Record<string, unknown>,
    origin: string,
    context: Record<string, unknown>,
  ) => {
    try {
      window.parent.postMessage(message, origin);
      return true;
    } catch (error) {
      const normalized = normalizeNoMessError(error, {
        kind: "runtime",
        code: "preview_postmessage_failed",
        operation: "preview.postMessage",
        details: context,
      });
      logEvent(
        "error",
        normalized.code,
        "Failed to post preview message to parent window",
        {
          ...context,
          targetOrigin: origin,
        },
        normalized,
      );
      return false;
    }
  };

  const emitPreviewError = (
    error: Error,
    origin: string,
    context: Record<string, unknown>,
  ) => {
    invokeOnError(error);

    const normalized = normalizeNoMessError(error, {
      kind: "runtime",
      code: "preview_exchange_failed",
      operation: "preview.emitError",
      details: context,
    });

    logEvent("error", normalized.code, normalized.message, context, normalized);
    postToParent(
      {
        type: "no-mess:preview-error",
        error: normalized.message,
        code: normalized.code,
        status: normalized.status,
        retryable: normalized.retryable,
      },
      origin,
      context,
    );
  };

  const runExchange = async (
    reason: "session-auth" | "refresh",
    origin: string,
  ) => {
    if (!sessionAuth) {
      logEvent(
        "debug",
        "preview_message_invalid",
        "Preview refresh ignored because no session is available",
        {
          reason,
        },
      );
      return;
    }

    const requestId = ++inFlightRequestId;

    try {
      const result = await config.client.exchangePreviewSession(sessionAuth);

      if (
        disposed ||
        requestId < inFlightRequestId ||
        requestId <= latestCompletedRequestId
      ) {
        logEvent(
          "debug",
          "preview_exchange_failed",
          "Discarded stale preview exchange result",
          {
            reason,
            requestId,
            inFlightRequestId,
            latestCompletedRequestId,
          },
        );
        return;
      }

      latestCompletedRequestId = requestId;

      try {
        config.onEntry(result.entry as NoMessEntry);
      } catch (error) {
        emitPreviewError(
          normalizeNoMessError(error, {
            kind: "runtime",
            code: "preview_exchange_failed",
            operation: "preview.onEntry",
            details: { reason },
          }),
          origin,
          { reason, requestId, phase: "onEntry" },
        );
        return;
      }

      postToParent({ type: "no-mess:preview-loaded" }, origin, {
        reason,
        requestId,
        phase: "loaded",
      });
    } catch (error) {
      if (
        disposed ||
        requestId < inFlightRequestId ||
        requestId <= latestCompletedRequestId
      ) {
        logEvent(
          "debug",
          "preview_exchange_failed",
          "Discarded stale preview exchange error",
          {
            reason,
            requestId,
            inFlightRequestId,
            latestCompletedRequestId,
          },
        );
        return;
      }

      latestCompletedRequestId = requestId;
      emitPreviewError(
        normalizeNoMessError(error, {
          kind: "runtime",
          code: "preview_exchange_failed",
          operation: "preview.exchange",
          details: { reason },
        }),
        origin,
        { reason, requestId, phase: "exchange" },
      );
    }
  };

  const handleMessage = async (event: MessageEvent) => {
    if (disposed || event.origin !== config.adminOrigin) return;

    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "no-mess:session-auth") {
      if (
        typeof data.sessionId !== "string" ||
        typeof data.sessionSecret !== "string"
      ) {
        emitPreviewError(
          createNoMessProtocolError(
            "Received invalid preview session credentials",
            {
              kind: "protocol",
              code: "preview_message_invalid",
              operation: "preview.session-auth",
              details: {
                receivedKeys:
                  data && typeof data === "object" ? Object.keys(data) : [],
              },
            },
          ),
          event.origin,
          { type: data.type },
        );
        return;
      }

      sessionAuth = {
        sessionId: data.sessionId,
        sessionSecret: data.sessionSecret,
      };
      await runExchange("session-auth", event.origin);
      return;
    }

    if (data.type === "no-mess:refresh") {
      if (!sessionAuth) {
        logEvent(
          "debug",
          "preview_message_invalid",
          "Ignored preview refresh before session authentication",
          {
            type: data.type,
          },
        );
        return;
      }

      await runExchange("refresh", event.origin);
    }
  };

  return {
    start: () => {
      disposed = false;
      window.addEventListener("message", handleMessage);
      postToParent({ type: "no-mess:preview-ready" }, "*", { phase: "ready" });
    },
    cleanup: () => {
      disposed = true;
      window.removeEventListener("message", handleMessage);
    },
  };
}
