"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAnalytics } from "@/hooks/use-analytics";
import { BEAT_NAMES } from "@/lib/analytics-events";

/**
 * Tracks section views, time-per-section, and max scroll depth
 * for the landing page scroll-jacking beats.
 */
export function useBeatTracking(currentBeat: number, totalBeats: number) {
  const analytics = useAnalytics();

  const viewedBeats = useRef(new Set<number>());
  const beatEnteredAt = useRef<number>(Date.now());
  const maxBeat = useRef(0);

  // Track first view of each section
  useEffect(() => {
    if (!viewedBeats.current.has(currentBeat)) {
      viewedBeats.current.add(currentBeat);
      const name = BEAT_NAMES[currentBeat] ?? `beat_${currentBeat}`;
      analytics.trackSectionViewed(name, currentBeat);
    }
  }, [currentBeat, analytics]);

  // Track time spent on previous section when beat changes
  const prevBeat = useRef(currentBeat);
  useEffect(() => {
    if (prevBeat.current === currentBeat) return;

    const durationMs = Date.now() - beatEnteredAt.current;
    const prevName = BEAT_NAMES[prevBeat.current] ?? `beat_${prevBeat.current}`;
    analytics.trackSectionTime(prevName, prevBeat.current, durationMs);

    prevBeat.current = currentBeat;
    beatEnteredAt.current = Date.now();
  }, [currentBeat, analytics]);

  // Track max scroll depth
  useEffect(() => {
    if (currentBeat > maxBeat.current) {
      maxBeat.current = currentBeat;
    }
  }, [currentBeat]);

  // Flush scroll depth + final section time on unmount/page leave
  const flush = useCallback(() => {
    const durationMs = Date.now() - beatEnteredAt.current;
    const name = BEAT_NAMES[prevBeat.current] ?? `beat_${prevBeat.current}`;
    analytics.trackSectionTime(name, prevBeat.current, durationMs);
    analytics.trackScrollDepth(maxBeat.current, totalBeats);
  }, [analytics, totalBeats]);

  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flush();
    };
  }, [flush]);
}
