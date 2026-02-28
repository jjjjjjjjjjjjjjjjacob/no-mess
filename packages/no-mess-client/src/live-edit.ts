import type { LiveEditConfig, LiveEditHandle } from "./types.js";

const OVERLAY_CONTAINER_ID = "no-mess-live-edit-overlays";
const OVERLAY_ATTR = "data-no-mess-overlay-for";
const FIELD_ATTR = "data-no-mess-field";

const OVERLAY_CSS = `
#${OVERLAY_CONTAINER_ID} {
  pointer-events: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2147483646;
}
.no-mess-overlay {
  position: absolute;
  border: 2px solid oklch(0.623 0.214 259.1);
  border-radius: 4px;
  pointer-events: auto;
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
}
.no-mess-overlay:hover {
  background-color: oklch(0.623 0.214 259.1 / 0.08);
}
.no-mess-overlay[data-focused="true"] {
  border-color: oklch(0.546 0.245 262.9);
  background-color: oklch(0.546 0.245 262.9 / 0.12);
  border-width: 3px;
}
.no-mess-overlay-label {
  position: absolute;
  top: -22px;
  left: -2px;
  background: oklch(0.623 0.214 259.1);
  color: white;
  font-size: 11px;
  font-family: system-ui, sans-serif;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 3px 3px 0 0;
  white-space: nowrap;
  pointer-events: none;
}
.no-mess-overlay[data-focused="true"] .no-mess-overlay-label {
  background: oklch(0.546 0.245 262.9);
}
`;

interface OverlayEntry {
  element: HTMLElement;
  overlay: HTMLDivElement;
  fieldName: string;
}

/**
 * Create a live edit handler that manages overlay highlights on annotated DOM
 * elements and communicates with the admin dashboard via postMessage.
 *
 * Usage in a client site's preview page:
 * ```ts
 * const handle = createLiveEditHandler({
 *   adminOrigin: "https://admin.no-mess.xyz",
 * });
 * // On cleanup: handle.cleanup();
 * ```
 */
export function createLiveEditHandler(config: LiveEditConfig): LiveEditHandle {
  let active = false;
  let container: HTMLDivElement | null = null;
  let styleEl: HTMLStyleElement | null = null;
  let overlays: OverlayEntry[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let scrollListener: (() => void) | null = null;
  let rafId: number | null = null;

  function injectStyles() {
    if (document.getElementById("no-mess-live-edit-styles")) return;
    styleEl = document.createElement("style");
    styleEl.id = "no-mess-live-edit-styles";
    styleEl.textContent = OVERLAY_CSS;
    document.head.appendChild(styleEl);
  }

  function createContainer() {
    container = document.createElement("div");
    container.id = OVERLAY_CONTAINER_ID;
    document.body.appendChild(container);
  }

  function getFieldElements(): Map<string, HTMLElement[]> {
    const map = new Map<string, HTMLElement[]>();
    const elements = document.querySelectorAll<HTMLElement>(`[${FIELD_ATTR}]`);
    for (const el of elements) {
      const fieldName = el.getAttribute(FIELD_ATTR);
      if (!fieldName) continue;
      const existing = map.get(fieldName);
      if (existing) {
        existing.push(el);
      } else {
        map.set(fieldName, [el]);
      }
    }
    return map;
  }

  function positionOverlay(overlay: HTMLDivElement, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  function updateAllPositions() {
    for (const entry of overlays) {
      positionOverlay(entry.overlay, entry.element);
    }
  }

  function schedulePositionUpdate() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateAllPositions();
    });
  }

  function buildOverlays() {
    // Clear existing overlays
    for (const entry of overlays) {
      entry.overlay.remove();
    }
    overlays = [];

    if (!container) return;

    const fieldElements = getFieldElements();
    const fieldRects: { fieldName: string; rect: DOMRect }[] = [];

    for (const [fieldName, elements] of fieldElements) {
      for (const element of elements) {
        const overlay = document.createElement("div");
        overlay.className = "no-mess-overlay";
        overlay.setAttribute(OVERLAY_ATTR, fieldName);

        const label = document.createElement("span");
        label.className = "no-mess-overlay-label";
        label.textContent = fieldName;
        overlay.appendChild(label);

        positionOverlay(overlay, element);

        overlay.addEventListener("click", () => {
          window.parent.postMessage(
            { type: "no-mess:field-clicked", fieldName },
            config.adminOrigin,
          );
          config.onFieldClicked?.(fieldName);
        });

        container.appendChild(overlay);
        overlays.push({ element, overlay, fieldName });

        const rect = element.getBoundingClientRect();
        fieldRects.push({ fieldName, rect: rect.toJSON() });

        // Observe element for size changes
        resizeObserver?.observe(element);
      }
    }

    // Send field map to admin
    const uniqueFields = [...new Set(fieldRects.map((f) => f.fieldName))];
    window.parent.postMessage(
      {
        type: "no-mess:field-map",
        fields: uniqueFields.map((fieldName) => {
          const match = fieldRects.find((f) => f.fieldName === fieldName);
          return { fieldName, rect: match?.rect };
        }),
      },
      config.adminOrigin,
    );
  }

  function enterLiveEdit() {
    if (active) return;
    active = true;

    injectStyles();
    createContainer();

    resizeObserver = new ResizeObserver(() => {
      schedulePositionUpdate();
    });

    buildOverlays();

    // Track scroll for repositioning
    scrollListener = () => schedulePositionUpdate();
    window.addEventListener("scroll", scrollListener, { passive: true });
    window.addEventListener("resize", scrollListener, { passive: true });

    // Track DOM mutations for SPA navigation
    mutationObserver = new MutationObserver(() => {
      // Debounce rescan slightly for batch mutations
      setTimeout(() => {
        if (active) buildOverlays();
      }, 100);
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    config.onEnter?.();
  }

  function exitLiveEdit() {
    if (!active) return;
    active = false;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    resizeObserver?.disconnect();
    resizeObserver = null;

    mutationObserver?.disconnect();
    mutationObserver = null;

    if (scrollListener) {
      window.removeEventListener("scroll", scrollListener);
      window.removeEventListener("resize", scrollListener);
      scrollListener = null;
    }

    for (const entry of overlays) {
      entry.overlay.remove();
    }
    overlays = [];

    container?.remove();
    container = null;

    styleEl?.remove();
    styleEl = null;

    config.onExit?.();
  }

  function handleFieldUpdate(fieldName: string, value: unknown) {
    const elements = document.querySelectorAll<HTMLElement>(
      `[${FIELD_ATTR}="${fieldName}"]`,
    );

    for (const el of elements) {
      if (el instanceof HTMLImageElement && typeof value === "string") {
        el.src = value;
      } else if (
        el instanceof HTMLElement &&
        el.style.backgroundImage &&
        typeof value === "string"
      ) {
        el.style.backgroundImage = `url(${value})`;
      } else if (typeof value === "string") {
        el.textContent = value;
      } else if (typeof value === "number" || typeof value === "boolean") {
        el.textContent = String(value);
      }
    }
  }

  function handleFieldFocus(fieldName: string) {
    for (const entry of overlays) {
      if (entry.fieldName === fieldName) {
        entry.overlay.setAttribute("data-focused", "true");
      }
    }
  }

  function handleFieldBlur(fieldName: string) {
    for (const entry of overlays) {
      if (entry.fieldName === fieldName) {
        entry.overlay.removeAttribute("data-focused");
      }
    }
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== config.adminOrigin) return;

    const data = event.data;
    if (!data || typeof data.type !== "string") return;

    switch (data.type) {
      case "no-mess:live-edit-enter":
        enterLiveEdit();
        break;
      case "no-mess:live-edit-exit":
        exitLiveEdit();
        break;
      case "no-mess:field-updated":
        if (data.fieldName && active) {
          handleFieldUpdate(data.fieldName, data.value);
        }
        break;
      case "no-mess:field-focus":
        if (data.fieldName && active) {
          handleFieldFocus(data.fieldName);
        }
        break;
      case "no-mess:field-blur":
        if (data.fieldName && active) {
          handleFieldBlur(data.fieldName);
        }
        break;
    }
  }

  // Start listening immediately
  window.addEventListener("message", handleMessage);

  return {
    cleanup: () => {
      window.removeEventListener("message", handleMessage);
      exitLiveEdit();
    },
  };
}
