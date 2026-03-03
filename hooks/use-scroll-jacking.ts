"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseScrollJackingOptions {
  /** Cooldown in ms between beat transitions */
  cooldown?: number;
  /** Set false to disable scroll-jacking (e.g. on mobile) */
  enabled?: boolean;
}

export function useScrollJacking(
  beatRefs: React.RefObject<HTMLElement | null>[],
  options: UseScrollJackingOptions = {},
) {
  const { cooldown = 800, enabled = true } = options;

  const [currentBeat, setCurrentBeat] = useState(0);
  const isTransitioning = useRef(false);
  const touchStartY = useRef(0);
  const totalBeats = beatRefs.length;

  // CSS scroll-snap on <html> — always active (mobile gets native snap, desktop gets JS hijacking)
  useEffect(() => {
    document.documentElement.style.scrollSnapType = "y mandatory";

    return () => {
      document.documentElement.style.scrollSnapType = "";
    };
  }, []);

  const scrollToBeat = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalBeats - 1));
      if (clamped === currentBeat || isTransitioning.current) return;
      const target = beatRefs[clamped]?.current;
      if (!target) return;

      isTransitioning.current = true;
      setCurrentBeat(clamped);
      target.scrollIntoView({ behavior: "smooth" });

      setTimeout(() => {
        isTransitioning.current = false;
      }, cooldown);
    },
    [beatRefs, cooldown, currentBeat, totalBeats],
  );

  // Wheel: prevent native scroll, trigger one-beat-at-a-time transitions
  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      // Always prevent native wheel scroll — we own navigation
      e.preventDefault();

      // Ignore during cooldown or tiny deltas
      if (isTransitioning.current) return;
      if (Math.abs(e.deltaY) < 5) return;

      const direction = e.deltaY > 0 ? "down" : "up";

      if (direction === "down") {
        scrollToBeat(currentBeat + 1);
      } else {
        scrollToBeat(currentBeat - 1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [currentBeat, scrollToBeat, enabled]);

  // Touch: prevent native touch scroll, trigger on swipe end
  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Block native touch scroll — CSS snap + our handler own navigation
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isTransitioning.current) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) < 50) return;

      if (deltaY > 0) {
        scrollToBeat(currentBeat + 1);
      } else {
        scrollToBeat(currentBeat - 1);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentBeat, scrollToBeat, enabled]);

  // Keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning.current) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (currentBeat >= totalBeats - 1) return;
        e.preventDefault();
        scrollToBeat(currentBeat + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (currentBeat === 0) return;
        e.preventDefault();
        scrollToBeat(currentBeat - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentBeat, scrollToBeat, enabled, totalBeats]);

  return { currentBeat, scrollToBeat, totalBeats };
}
