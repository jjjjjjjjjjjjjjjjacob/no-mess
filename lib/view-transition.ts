/**
 * View Transitions API utilities for smooth theme/palette switching.
 *
 * Uses `document.startViewTransition()` to crossfade the entire page as a
 * single composited screenshot instead of per-element CSS transitions.
 *
 * Circle reveal uses dynamically injected `@keyframes` with baked-in pixel
 * values, avoiding CSS variable inheritance issues on view-transition pseudos.
 *
 * Fallback: direct execution when the API is unavailable.
 */

export type TransitionOrigin = { x: number; y: number };

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Inject a dynamic `<style>` with `@keyframes vt-expand-circle` that has
 * baked-in pixel values for the circle origin and radius. This avoids CSS
 * variable inheritance issues in `@keyframes` on view-transition pseudos.
 *
 * Returns a cleanup function that removes the injected `<style>`.
 */
function injectCircleKeyframes(origin: TransitionOrigin): () => void {
  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const style = document.createElement("style");
  style.textContent = `@keyframes vt-expand-circle{from{clip-path:circle(0px at ${origin.x}px ${origin.y}px)}to{clip-path:circle(${endRadius}px at ${origin.x}px ${origin.y}px)}}`;
  document.head.appendChild(style);
  return () => style.remove();
}

/**
 * Suppress per-element CSS transitions for one frame cycle, then remove.
 * Used in the non-VT fallback path so color changes appear atomic.
 */
function suppressTransitions(html: HTMLElement): void {
  html.classList.add("vt-transitioning");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.classList.remove("vt-transitioning");
    });
  });
}

/**
 * Wrap any synchronous DOM mutation in a view transition.
 * Adds `.vt-transitioning` to `<html>` during capture to suppress per-element
 * CSS transitions so the browser snapshots the final state instantly.
 *
 * When `origin` is provided, uses an expanding circle clip-path from that point
 * instead of the default crossfade.
 *
 * When `onFinished` is provided, it runs after the transition completes (or
 * immediately in fallback paths). Use this to defer side-effects like
 * router.replace() that could disrupt an in-progress view transition.
 */
export function withViewTransition(
  mutate: () => void,
  origin?: TransitionOrigin,
  onFinished?: () => void,
): void {
  if (typeof document === "undefined") {
    mutate();
    onFinished?.();
    return;
  }

  const html = document.documentElement;

  if (!("startViewTransition" in document)) {
    suppressTransitions(html);
    mutate();
    onFinished?.();
    return;
  }

  // Suppress per-element transitions during capture
  html.classList.add("vt-transitioning");

  // Inject dynamic keyframes + add circle class before transition starts
  let removeKeyframes: (() => void) | undefined;
  const useCircle = origin && !prefersReducedMotion();
  if (useCircle) {
    removeKeyframes = injectCircleKeyframes(origin);
    html.classList.add("vt-circle");
  }

  const transition = document.startViewTransition(() => {
    mutate();
  });

  // Clean up once the transition finishes (or if it skips)
  transition.finished.finally(() => {
    html.classList.remove("vt-transitioning");
    if (useCircle) {
      html.classList.remove("vt-circle");
      removeKeyframes?.();
    }
    onFinished?.();
  });
}

/**
 * Handle `next-themes` theme switching inside a view transition.
 *
 * `setTheme()` applies the `.dark` class asynchronously via React useEffect,
 * so we manually toggle `.dark` on `<html>` synchronously inside the view
 * transition callback, then call `setTheme()` to sync React state/localStorage.
 *
 * For `"system"` theme, resolves the actual preference via `matchMedia`.
 *
 * When `origin` is provided, uses an expanding circle clip-path from that point.
 */
export function switchThemeWithTransition(
  newTheme: string,
  setTheme: (theme: string) => void,
  origin?: TransitionOrigin,
): void {
  if (typeof document === "undefined") {
    setTheme(newTheme);
    return;
  }

  const html = document.documentElement;

  // Resolve what the effective dark/light mode should be
  let shouldBeDark: boolean;
  if (newTheme === "system") {
    shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } else {
    shouldBeDark = newTheme === "dark";
  }

  if (!("startViewTransition" in document)) {
    suppressTransitions(html);
    if (shouldBeDark) {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }
    setTheme(newTheme);
    return;
  }

  html.classList.add("vt-transitioning");

  // Inject dynamic keyframes + add circle class before transition starts
  let removeKeyframes: (() => void) | undefined;
  const useCircle = origin && !prefersReducedMotion();
  if (useCircle) {
    removeKeyframes = injectCircleKeyframes(origin);
    html.classList.add("vt-circle");
  }

  const transition = document.startViewTransition(() => {
    // Synchronously toggle .dark so the browser captures the correct state
    if (shouldBeDark) {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }
  });

  transition.finished.finally(() => {
    html.classList.remove("vt-transitioning");
    if (useCircle) {
      html.classList.remove("vt-circle");
      removeKeyframes?.();
    }
    // Sync React state + localStorage after transition completes so
    // next-themes re-renders don't disrupt the in-progress animation.
    // The DOM mutation (.dark class + colorScheme) already happened
    // synchronously in the VT callback above.
    setTheme(newTheme);
  });
}
