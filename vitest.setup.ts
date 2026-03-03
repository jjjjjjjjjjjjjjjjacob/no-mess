import "@testing-library/jest-dom/vitest";

// Base UI popup components wait for CSS animations to finish before removing `hidden`.
// JSDOM doesn't support CSS animations, so use Base UI's official testing escape hatch.
// Set on both globalThis and window to cover all module scopes.
(globalThis as unknown as Record<string, unknown>).BASE_UI_ANIMATIONS_DISABLED =
  true;
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).BASE_UI_ANIMATIONS_DISABLED =
    true;
}
