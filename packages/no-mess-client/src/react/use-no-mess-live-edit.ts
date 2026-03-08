"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeNoMessError } from "../error-utils.js";
import { createSdkLogger } from "../logging.js";
import { createLiveEditHandler } from "../live-edit.js";
import type {
  NoMessError,
  UseNoMessLiveEditConfig,
  UseNoMessLiveEditResult,
} from "../types.js";
import { DEFAULT_ADMIN_ORIGIN } from "../types.js";

/**
 * React hook for live edit mode. When the admin dashboard sends a
 * `no-mess:live-edit-enter` message, this hook activates overlays on
 * elements with `data-no-mess-field` attributes and tracks field value
 * overrides sent from the admin.
 *
 * Usage:
 * ```tsx
 * const { isLiveEditActive, fieldOverrides } = useNoMessLiveEdit({
 *   adminOrigin: "https://admin.no-mess.xyz",
 * });
 * const title = (fieldOverrides.title as string) ?? entry?.title;
 * ```
 */
export function useNoMessLiveEdit(
  config: UseNoMessLiveEditConfig,
): UseNoMessLiveEditResult {
  const [isLiveEditActive, setIsLiveEditActive] = useState(false);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, unknown>>(
    {},
  );
  const [error, setError] = useState<Error | null>(null);
  const [errorDetails, setErrorDetails] = useState<NoMessError | null>(null);

  const configRef = useRef(config);
  configRef.current = config;
  const loggerRef = useRef(createSdkLogger(config.logger));
  loggerRef.current = createSdkLogger(config.logger);

  const handleFieldUpdate = useCallback((event: MessageEvent) => {
    const origin = configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN;
    if (event.origin !== origin) return;

    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "no-mess:field-updated" && typeof data.fieldName === "string") {
      setFieldOverrides((prev) => ({
        ...prev,
        [data.fieldName]: data.value,
      }));
      return;
    }

    if (data.type === "no-mess:field-updated") {
      loggerRef.current({
        level: "debug",
        code: "live_edit_runtime_failed",
        message: "Ignored malformed live edit field update message in React state bridge",
        scope: "live-edit-react",
        operation: "useNoMessLiveEdit.handleFieldUpdate",
        timestamp: new Date().toISOString(),
        context: {},
      });
    }
  }, []);

  useEffect(() => {
    const adminOrigin = configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN;

    const handle = createLiveEditHandler({
      adminOrigin,
      logger: configRef.current.logger,
      onEnter: () => {
        setIsLiveEditActive(true);
        setFieldOverrides({});
        setError(null);
        setErrorDetails(null);
      },
      onExit: () => {
        setIsLiveEditActive(false);
        setFieldOverrides({});
      },
      onError: (err) => {
        const normalized = normalizeNoMessError(err, {
          kind: "runtime",
          code: "live_edit_runtime_failed",
          operation: "useNoMessLiveEdit.onError",
        });
        setError(normalized);
        setErrorDetails(normalized);
      },
    });

    // Also listen for field-updated to track overrides in React state
    window.addEventListener("message", handleFieldUpdate);

    return () => {
      handle.cleanup();
      window.removeEventListener("message", handleFieldUpdate);
    };
  }, [handleFieldUpdate]);

  return { isLiveEditActive, fieldOverrides, error, errorDetails };
}
