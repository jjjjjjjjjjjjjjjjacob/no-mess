"use client";

import { useEffect, useRef, useState } from "react";
import { NoMessClient } from "../client.js";
import { createPreviewHandler } from "../index.js";
import type {
  NoMessEntry,
  UseNoMessPreviewConfig,
  UseNoMessPreviewResult,
} from "../types.js";
import { DEFAULT_ADMIN_ORIGIN } from "../types.js";

export function useNoMessPreview<T extends NoMessEntry = NoMessEntry>(
  config: UseNoMessPreviewConfig,
): UseNoMessPreviewResult<T> {
  const [entry, setEntry] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const client = new NoMessClient({
      apiKey: configRef.current.apiKey,
      apiUrl: configRef.current.apiUrl,
    });

    const handler = createPreviewHandler({
      client,
      adminOrigin: configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN,
      onEntry: (e) => {
        setEntry(e as T);
        setError(null);
        setIsLoading(false);
      },
      onError: (err) => {
        setError(err);
        setIsLoading(false);
      },
    });

    handler.start();
    return () => handler.cleanup();
  }, []);

  return { entry, error, isLoading };
}
