"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_INTERVAL = 2 * 60 * 1000; // 2 minutes

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  isDirty: boolean;
  interval?: number;
  enabled?: boolean;
}

/**
 * Auto-saves at a regular interval when the form is dirty.
 * Silently swallows errors (user can manually save).
 */
export function useAutoSave({
  onSave,
  isDirty,
  interval = DEFAULT_INTERVAL,
  enabled = true,
}: UseAutoSaveOptions) {
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const savingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await onSaveRef.current();
      setLastSavedAt(Date.now());
    } catch {
      // Silently swallow auto-save errors
    } finally {
      savingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const id = setInterval(() => {
      void save();
    }, interval);

    return () => clearInterval(id);
  }, [enabled, isDirty, interval, save]);

  return { lastSavedAt, save };
}
