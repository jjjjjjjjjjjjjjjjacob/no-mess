"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createLiveEditHandler } from "../live-edit.js";
import type {
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

  const configRef = useRef(config);
  configRef.current = config;

  const handleFieldUpdate = useCallback((event: MessageEvent) => {
    const origin = configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN;
    if (event.origin !== origin) return;

    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "no-mess:field-updated" && data.fieldName) {
      setFieldOverrides((prev) => ({
        ...prev,
        [data.fieldName]: data.value,
      }));
    }
  }, []);

  useEffect(() => {
    const adminOrigin = configRef.current.adminOrigin ?? DEFAULT_ADMIN_ORIGIN;

    const handle = createLiveEditHandler({
      adminOrigin,
      onEnter: () => {
        setIsLiveEditActive(true);
        setFieldOverrides({});
      },
      onExit: () => {
        setIsLiveEditActive(false);
        setFieldOverrides({});
      },
    });

    // Also listen for field-updated to track overrides in React state
    window.addEventListener("message", handleFieldUpdate);

    return () => {
      handle.cleanup();
      window.removeEventListener("message", handleFieldUpdate);
    };
  }, [handleFieldUpdate]);

  return { isLiveEditActive, fieldOverrides };
}
