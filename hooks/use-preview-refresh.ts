import { useEffect, useRef } from "react";
import { useDebouncedValue } from "./use-debounced-value";

interface UsePreviewRefreshOptions {
  formData: Record<string, unknown>;
  title: string;
  isPreviewActive: boolean;
  onRefresh: () => void;
  delay?: number;
}

/**
 * Watches form data and title for changes, then triggers a preview refresh
 * after a debounce delay. Skips the initial mount to avoid spurious refreshes.
 */
export function usePreviewRefresh({
  formData,
  title,
  isPreviewActive,
  onRefresh,
  delay = 800,
}: UsePreviewRefreshOptions) {
  const serialized = JSON.stringify({ title, formData });
  const debouncedValue = useDebouncedValue(serialized, delay);
  const isInitialMount = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: debouncedValue is the change trigger
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isPreviewActive) return;

    onRefresh();
  }, [debouncedValue, isPreviewActive, onRefresh]);
}
