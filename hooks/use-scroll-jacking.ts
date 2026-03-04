"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseScrollJackingOptions {
  /** Cooldown in ms between beat transitions */
  cooldown?: number;
  /** Set false to disable scroll-jacking (e.g. on mobile) */
  enabled?: boolean;
  /** Called just before a beat transition with navigation context */
  onNavigate?: (
    method: string,
    direction: "up" | "down",
    fromBeat: number,
    toBeat: number,
  ) => void;
}

export function useScrollJacking(
  beatRefs: React.RefObject<HTMLElement | null>[],
  options: UseScrollJackingOptions = {},
) {
  const { cooldown = 800, enabled = true, onNavigate } = options;

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
      const toBeat = Math.max(
        0,
        Math.min(
          direction === "down" ? currentBeat + 1 : currentBeat - 1,
          totalBeats - 1,
        ),
      );
      if (toBeat === currentBeat) return;
      onNavigate?.("wheel", direction, currentBeat, toBeat);
      scrollToBeat(toBeat);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [currentBeat, scrollToBeat, enabled, onNavigate, totalBeats]);

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

      const direction = deltaY > 0 ? "down" : "up";
      const toBeat = Math.max(
        0,
        Math.min(
          direction === "down" ? currentBeat + 1 : currentBeat - 1,
          totalBeats - 1,
        ),
      );
      if (toBeat === currentBeat) return;
      onNavigate?.("touch", direction, currentBeat, toBeat);
      scrollToBeat(toBeat);
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [currentBeat, scrollToBeat, enabled, onNavigate, totalBeats]);

  // Keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning.current) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (currentBeat >= totalBeats - 1) return;
        e.preventDefault();
        onNavigate?.("keyboard", "down", currentBeat, currentBeat + 1);
        scrollToBeat(currentBeat + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (currentBeat === 0) return;
        e.preventDefault();
        onNavigate?.("keyboard", "up", currentBeat, currentBeat - 1);
        scrollToBeat(currentBeat - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentBeat, scrollToBeat, enabled, totalBeats, onNavigate]);

  // Scroll sync: detect native scrollbar drags and resync currentBeat
  useEffect(() => {
    if (!enabled) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      // Skip during programmatic transitions (scrollIntoView)
      if (isTransitioning.current) return;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let closestBeat = 0;
        let closestDistance = Infinity;

        for (let i = 0; i < totalBeats; i++) {
          const el = beatRefs[i]?.current;
          if (!el) continue;
          const distance = Math.abs(el.getBoundingClientRect().top);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestBeat = i;
          }
        }

        setCurrentBeat(closestBeat);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [beatRefs, enabled, totalBeats]);

  return { currentBeat, scrollToBeat, totalBeats };
}
