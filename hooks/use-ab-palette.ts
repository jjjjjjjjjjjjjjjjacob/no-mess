"use client";

import { useFeatureFlagVariantKey, usePostHog } from "posthog-js/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LANDING_AB_PALETTE_ASSIGNED } from "@/lib/analytics-events";

const FLAG_KEY = "landing-palette-experiment";
const STORAGE_KEY = "ab-palette-assigned";
const DEFAULT_PALETTE = "oceanic";

interface UseAbPaletteResult {
  /** The palette ID assigned by the A/B test (or fallback) */
  assignedPalette: string;
  /** True while waiting for PostHog to resolve */
  isLoading: boolean;
  /** True if the user manually overrode their A/B assignment */
  isOverridden: boolean;
  /** Call when user manually selects a different palette */
  markOverride: (newId: string) => void;
}

export function useAbPalette(validPaletteIds: string[]): UseAbPaletteResult {
  const posthog = usePostHog();
  const variant = useFeatureFlagVariantKey(FLAG_KEY);
  const hasTracked = useRef(false);

  // Check if user has an explicit palette preference (set only by manual click)
  const [userPreference] = useState(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("palette");
    return stored && validPaletteIds.includes(stored) ? stored : null;
  });
  const hasUserPreference = userPreference !== null;

  // Check URL param first (share links always win)
  const [urlOverride] = useState(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("palette");
  });

  // Check localStorage for cached A/B assignment
  const [cached] = useState(() => {
    if (typeof window === "undefined") return null;
    // If user already has a preference, skip the A/B cache entirely
    if (hasUserPreference) return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  // Check if user has manually overridden (legacy flag or user preference)
  const [isOverridden, setIsOverridden] = useState(() => {
    if (typeof window === "undefined") return false;
    if (hasUserPreference) return true;
    return localStorage.getItem("ab-palette-overridden") === "true";
  });

  // Resolve assignment: URL > user preference > cached > PostHog > default
  const resolvedFromFlag =
    typeof variant === "string" && validPaletteIds.includes(variant)
      ? variant
      : null;

  const isLoading =
    variant === undefined && !urlOverride && !cached && !hasUserPreference;

  const assignedPalette =
    urlOverride && validPaletteIds.includes(urlOverride)
      ? urlOverride
      : hasUserPreference
        ? userPreference
        : cached && validPaletteIds.includes(cached)
          ? cached
          : (resolvedFromFlag ?? DEFAULT_PALETTE);

  // Cache A/B assignment + track once (skip if user already has a preference)
  useEffect(() => {
    if (hasUserPreference) return;
    if (isLoading || hasTracked.current) return;
    if (urlOverride) return; // Don't cache URL overrides as A/B assignments

    localStorage.setItem(STORAGE_KEY, assignedPalette);

    if (!hasTracked.current && !posthog?.has_opted_out_capturing()) {
      hasTracked.current = true;
      posthog?.capture(LANDING_AB_PALETTE_ASSIGNED, {
        palette: assignedPalette,
        source: resolvedFromFlag
          ? "feature_flag"
          : cached
            ? "cache"
            : "default",
      });
      posthog?.setPersonProperties({ ab_palette: assignedPalette });
    }
  }, [
    hasUserPreference,
    isLoading,
    assignedPalette,
    urlOverride,
    posthog,
    resolvedFromFlag,
    cached,
  ]);

  const markOverride = useCallback((newId: string) => {
    setIsOverridden(true);
    localStorage.setItem("ab-palette-overridden", "true");
    localStorage.setItem("palette", newId);
  }, []);

  return { assignedPalette, isLoading, isOverridden, markOverride };
}
