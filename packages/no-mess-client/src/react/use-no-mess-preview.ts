"use client";

import { useEffect, useRef, useState } from "react";
import { NoMessClient } from "../client.js";
import { normalizeNoMessError } from "../error-utils.js";
import { createPreviewHandler } from "../index.js";
import type {
  NoMessEntry,
  NoMessError,
  UseNoMessPreviewConfig,
  UseNoMessPreviewResult,
} from "../types.js";
import { DEFAULT_ADMIN_ORIGIN } from "../types.js";

export function useNoMessPreview<T extends NoMessEntry = NoMessEntry>(
  config: UseNoMessPreviewConfig,
): UseNoMessPreviewResult<T> {
  const [entry, setEntry] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [errorDetails, setErrorDetails] = useState<NoMessError | null>(null);
  const [status, setStatus] = useState<UseNoMessPreviewResult<T>["status"]>(
    "waiting-for-admin",
  );

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const baseClient = new NoMessClient({
      apiKey: configRef.current.apiKey,
      apiUrl: configRef.current.apiUrl,
      logger: configRef.current.logger,
    });

    const client = {
      exchangePreviewSession: async (...args: Parameters<NoMessClient["exchangePreviewSession"]>) => {
        setStatus("exchanging-session");
        return baseClient.exchangePreviewSession(...args);
      },
    };

    const handler = createPreviewHandler({
      client,
      adminOrigin: configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN,
      logger: configRef.current.logger,
      onEntry: (e) => {
        setEntry(e as T);
        setError(null);
        setErrorDetails(null);
        setStatus("ready");
      },
      onError: (err) => {
        const normalized = normalizeNoMessError(err, {
          kind: "runtime",
          code: "preview_exchange_failed",
          operation: "useNoMessPreview.onError",
        });
        setError(normalized);
        setErrorDetails(normalized);
        setStatus("error");
      },
    });

    handler.start();
    return () => handler.cleanup();
  }, []);

  return {
    entry,
    error,
    errorDetails,
    isLoading: status !== "ready" && status !== "error",
    status,
  };
}
