"use client";

import { useCallback, useEffect } from "react";

/**
 * Warns the user before closing/refreshing the page when there are unsaved changes.
 */
export function useBeforeUnload(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}

/**
 * Listens for Cmd+S (Mac) / Ctrl+S (Windows/Linux) and calls the provided callback.
 */
export function useKeyboardSave(onSave: () => void) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    },
    [onSave],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
