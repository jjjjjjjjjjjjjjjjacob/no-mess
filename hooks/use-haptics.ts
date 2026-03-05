"use client";

import { useCallback } from "react";
import { useWebHaptics } from "web-haptics/react";

export type HapticPattern = "tap" | "success" | "toggle" | "select";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [50, 50, 50],
  toggle: [15, 30, 15],
  select: 15,
};

export function useHaptics() {
  const { trigger } = useWebHaptics();

  const haptic = useCallback(
    (pattern: HapticPattern = "tap") => {
      trigger(PATTERNS[pattern]);
    },
    [trigger],
  );

  return haptic;
}
