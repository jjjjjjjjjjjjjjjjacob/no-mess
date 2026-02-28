/**
 * View Transitions API utilities for smooth theme/palette switching.
 *
 * Uses `document.startViewTransition()` to crossfade the entire page as a
 * single composited screenshot instead of per-element CSS transitions.
 *
 * Fallback: direct execution when the API is unavailable.
 */

/**
 * Wrap any synchronous DOM mutation in a view transition.
 * Adds `.vt-transitioning` to `<html>` during capture to suppress per-element
 * CSS transitions so the browser snapshots the final state instantly.
 */
export function withViewTransition(mutate: () => void): void {
  if (typeof document === "undefined" || !("startViewTransition" in document)) {
    mutate();
    return;
  }

  const html = document.documentElement;

  // Suppress per-element transitions during capture
  html.classList.add("vt-transitioning");

  const transition = document.startViewTransition(() => {
    mutate();
  });

  // Clean up once the transition finishes (or if it skips)
  transition.finished.finally(() => {
    html.classList.remove("vt-transitioning");
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
 */
export function switchThemeWithTransition(
  newTheme: string,
  setTheme: (theme: string) => void,
): void {
  if (typeof document === "undefined" || !("startViewTransition" in document)) {
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

  html.classList.add("vt-transitioning");

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
  });

  // Sync React state + localStorage (idempotent re-run of the class change)
  setTheme(newTheme);
}
