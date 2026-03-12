"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NoMessClient } from "../client.js";
import { normalizeNoMessError } from "../error-utils.js";
import { createPreviewHandler } from "../index.js";
import { createLiveEditHandler } from "../live-edit.js";
import { setValueAtPath } from "../schema/tree-utils.js";
import type {
  NoMessContextValue,
  NoMessEntry,
  NoMessLiveRouteProviderProps,
  NoMessProviderProps,
  ReportLiveEditRouteOptions,
  UseNoMessEditableEntryOptions,
  UseNoMessLiveEditResult,
  UseNoMessPreviewResult,
} from "../types.js";
import { DEFAULT_ADMIN_ORIGIN } from "../types.js";

const REPORTED_ROUTE_CACHE_PREFIX = "no-mess:reported-route";
const REPORTED_ROUTE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSIENT_PARAMS = ["preview", "secret", "sid", "slug", "type"];

const NoMessContext = createContext<NoMessContextValue | null>(null);

function sortSearchParams(url: URL) {
  const entries = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  url.search = "";
  for (const [key, value] of entries) {
    url.searchParams.append(key, value);
  }
}

function normalizeRouteUrl(url: string) {
  const normalized = new URL(url, window.location.href);
  for (const param of TRANSIENT_PARAMS) {
    normalized.searchParams.delete(param);
  }
  sortSearchParams(normalized);
  return normalized.toString();
}

function createReportedRouteCacheKey(entryId: string, url: string) {
  return `${REPORTED_ROUTE_CACHE_PREFIX}:${entryId}:${url}`;
}

function shouldReportRoute(entryId: string, url: string) {
  if (typeof localStorage === "undefined") {
    return true;
  }

  const key = createReportedRouteCacheKey(entryId, url);
  const lastReportedAt = Number(localStorage.getItem(key) ?? "0");
  return (
    !lastReportedAt || Date.now() - lastReportedAt >= REPORTED_ROUTE_TTL_MS
  );
}

function markRouteReported(entryId: string, url: string) {
  if (typeof localStorage === "undefined") {
    return;
  }

  const key = createReportedRouteCacheKey(entryId, url);
  localStorage.setItem(key, String(Date.now()));
}

function defaultPreviewState(): UseNoMessPreviewResult {
  return {
    entry: null,
    error: null,
    errorDetails: null,
    isLoading: true,
    status: "waiting-for-admin",
  };
}

function defaultLiveEditState(): UseNoMessLiveEditResult {
  return {
    isLiveEditActive: false,
    fieldOverrides: {},
    error: null,
    errorDetails: null,
  };
}

function applyFieldOverrides<T extends Record<string, unknown>>(
  entry: T,
  overrides: Record<string, unknown>,
) {
  let nextEntry = { ...entry };
  for (const [path, value] of Object.entries(overrides)) {
    nextEntry = setValueAtPath(nextEntry, path, value);
  }
  return nextEntry;
}

/**
 * Provider for route-aware preview and live edit on real site routes.
 * Keeps the legacy preview-only APIs available while adding route reporting
 * and entry binding for live edit on delivered pages.
 */
export function NoMessLiveRouteProvider({
  children,
  liveEditConfig,
  ...previewConfig
}: NoMessLiveRouteProviderProps) {
  const [isIframe, setIsIframe] = useState(false);
  const [preview, setPreview] =
    useState<UseNoMessPreviewResult>(defaultPreviewState);
  const [liveEdit, setLiveEdit] =
    useState<UseNoMessLiveEditResult>(defaultLiveEditState);

  const adminOrigin =
    liveEditConfig?.adminOrigin ??
    previewConfig.adminOrigin ??
    DEFAULT_ADMIN_ORIGIN;

  const client = useMemo(
    () =>
      new NoMessClient({
        apiKey: previewConfig.apiKey,
        apiUrl: previewConfig.apiUrl,
        logger: previewConfig.logger,
      }),
    [previewConfig.apiKey, previewConfig.apiUrl, previewConfig.logger],
  );

  useEffect(() => {
    const iframe = window.self !== window.top;
    setIsIframe(iframe);

    if (!iframe) {
      setPreview({
        entry: null,
        error: null,
        errorDetails: null,
        isLoading: false,
        status: "ready",
      });
      return;
    }

    const previewHandler = createPreviewHandler({
      client: {
        exchangePreviewSession: async (...args) => {
          setPreview((current) => ({
            ...current,
            isLoading: true,
            status: "exchanging-session",
          }));
          return client.exchangePreviewSession(...args);
        },
      },
      adminOrigin,
      logger: previewConfig.logger,
      onEntry: (entry) => {
        setPreview({
          entry,
          error: null,
          errorDetails: null,
          isLoading: false,
          status: "ready",
        });
      },
      onError: (error) => {
        const normalized = normalizeNoMessError(error, {
          kind: "runtime",
          code: "preview_exchange_failed",
          operation: "NoMessLiveRouteProvider.onPreviewError",
        });
        setPreview({
          entry: null,
          error: normalized,
          errorDetails: normalized,
          isLoading: false,
          status: "error",
        });
      },
    });

    const liveEditHandler = createLiveEditHandler({
      adminOrigin,
      logger: liveEditConfig?.logger ?? previewConfig.logger,
      onEnter: () => {
        setLiveEdit({
          isLiveEditActive: true,
          fieldOverrides: {},
          error: null,
          errorDetails: null,
        });
      },
      onExit: () => {
        setLiveEdit({
          isLiveEditActive: false,
          fieldOverrides: {},
          error: null,
          errorDetails: null,
        });
      },
      onError: (error) => {
        const normalized = normalizeNoMessError(error, {
          kind: "runtime",
          code: "live_edit_runtime_failed",
          operation: "NoMessLiveRouteProvider.onLiveEditError",
        });
        setLiveEdit((current) => ({
          ...current,
          error: normalized,
          errorDetails: normalized,
        }));
      },
    });

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== adminOrigin) return;

      const data = event.data;
      if (!data || typeof data.type !== "string") return;

      if (
        data.type === "no-mess:field-updated" &&
        typeof data.fieldName === "string"
      ) {
        setLiveEdit((current) => ({
          ...current,
          fieldOverrides: {
            ...current.fieldOverrides,
            [data.fieldName]: data.value,
          },
        }));
      }
    };

    previewHandler.start();
    window.addEventListener("message", handleMessage);

    return () => {
      previewHandler.cleanup();
      liveEditHandler.cleanup();
      window.removeEventListener("message", handleMessage);
    };
  }, [adminOrigin, client, liveEditConfig?.logger, previewConfig.logger]);

  const value = useMemo<NoMessContextValue>(
    () => ({
      adminOrigin,
      apiKey: previewConfig.apiKey,
      apiUrl: previewConfig.apiUrl,
      bindEntry: (entryId: string) => {
        if (!isIframe) return;
        window.parent.postMessage(
          { type: "no-mess:entry-bound", entryId },
          adminOrigin,
        );
      },
      client,
      isIframe,
      preview,
      liveEdit,
    }),
    [
      adminOrigin,
      client,
      isIframe,
      liveEdit,
      preview,
      previewConfig.apiKey,
      previewConfig.apiUrl,
    ],
  );

  return <NoMessContext value={value}>{children}</NoMessContext>;
}

/**
 * Backward-compatible alias for the route-aware provider.
 */
export function NoMessProvider(props: NoMessProviderProps) {
  return <NoMessLiveRouteProvider {...props} />;
}

/** Access the current no-mess provider context. */
export function useNoMess() {
  return useContext(NoMessContext);
}

/** Read a single live field override from provider context. */
export function useNoMessField<T = unknown>(fieldName: string) {
  const ctx = useContext(NoMessContext);
  if (!ctx) return undefined;
  return ctx.liveEdit.fieldOverrides[fieldName] as T | undefined;
}

/**
 * Returns the entry visible on the current route, switching to preview/draft
 * content when the active iframe session targets this entry.
 */
export function useNoMessEditableEntry<T extends NoMessEntry>(
  entry: T,
  options?: UseNoMessEditableEntryOptions,
) {
  const ctx = useContext(NoMessContext);
  const lastBoundEntryId = useRef<string | null>(null);
  const registerCurrentUrl = options?.registerCurrentUrl ?? true;

  useEffect(() => {
    if (!ctx || !registerCurrentUrl) return;
    if (typeof window === "undefined") return;

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeRouteUrl(options?.url ?? window.location.href);
    } catch {
      return;
    }

    if (!shouldReportRoute(entry._id, normalizedUrl)) {
      return;
    }

    let cancelled = false;
    const reportOptions: ReportLiveEditRouteOptions = {
      entryId: entry._id,
      url: normalizedUrl,
    };

    void ctx.client
      .reportLiveEditRoute(reportOptions)
      .then(() => {
        if (!cancelled) {
          markRouteReported(entry._id, normalizedUrl);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [ctx, entry._id, options?.url, registerCurrentUrl]);

  const matchesPreviewEntry = ctx?.preview.entry?._id === entry._id;

  useEffect(() => {
    if (!ctx || !ctx.isIframe || !matchesPreviewEntry) return;
    if (lastBoundEntryId.current === entry._id) return;

    ctx.bindEntry(entry._id);
    lastBoundEntryId.current = entry._id;
  }, [ctx, entry._id, matchesPreviewEntry]);

  if (!ctx || !matchesPreviewEntry) {
    return entry;
  }

  return {
    ...applyFieldOverrides(
      {
        ...entry,
        ...(ctx.preview.entry as T),
      },
      ctx.liveEdit.fieldOverrides,
    ),
  };
}
