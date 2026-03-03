import { useEffect } from "react";

const FAVICON_ATTR = "data-dynamic-favicon";

/**
 * Dynamically renders a three-dot SVG favicon that reflects the current
 * palette's --primary, --accent, and --foreground CSS variables.
 *
 * Falls back to the static favicon.ico for SSR / crawlers / browsers
 * without SVG favicon support.
 */
export function useFavicon(paletteId: string, resolvedTheme: string): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: paletteId and resolvedTheme are intentional triggers — CSS vars change when palette/theme changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Wait a frame so CSS vars from palette class have settled
    const raf = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      const primary = style.getPropertyValue("--primary").trim();
      const accent = style.getPropertyValue("--accent").trim();
      const foreground = style.getPropertyValue("--foreground").trim();

      if (!primary || !accent || !foreground) return;

      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
        `<circle cx="5" cy="16" r="5" fill="${primary}"/>`,
        `<circle cx="16" cy="16" r="5" fill="${accent}"/>`,
        `<circle cx="27" cy="16" r="5" fill="${foreground}"/>`,
        "</svg>",
      ].join("");

      const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

      // Reuse existing dynamic link or create one
      let link = document.querySelector<HTMLLinkElement>(
        `link[${FAVICON_ATTR}]`,
      );
      if (!link) {
        link = document.createElement("link");
        link.setAttribute(FAVICON_ATTR, "");
        link.rel = "icon";
        link.type = "image/svg+xml";
        document.head.appendChild(link);
      }
      link.href = href;
    });

    return () => cancelAnimationFrame(raf);
  }, [paletteId, resolvedTheme]);
}
