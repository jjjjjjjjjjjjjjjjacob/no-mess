"use client";

import { useEffect, useState } from "react";

/**
 * Observes a section ref and returns whether it's in the viewport.
 * Works on both desktop (triggered by scroll-jacking scrollIntoView)
 * and mobile (triggered by natural scroll). Re-triggers on re-entry.
 */
export function useBeatReveal(
  ref: React.RefObject<HTMLElement | null>,
  threshold = 0.2,
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return isVisible;
}
