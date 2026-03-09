import { normalizeNoMessError } from "./error-utils.js";
import { createSdkLogger } from "./logging.js";
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
#${OVERLAY_CONTAINER_ID}[data-select-mode="false"] {
  opacity: 0;
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

interface SerializableRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function serializeRect(rect: DOMRect): SerializableRect {
  const rectWithJson = rect as DOMRect & {
    toJSON?: () => SerializableRect;
  };

  if (typeof rectWithJson.toJSON === "function") {
    return rectWithJson.toJSON();
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  };
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
  const logger = createSdkLogger(config.logger);
  let active = false;
  let container: HTMLDivElement | null = null;
  let styleEl: HTMLStyleElement | null = null;
  let overlays: OverlayEntry[] = [];
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let scrollListener: (() => void) | null = null;
  let rafId: number | null = null;
  let selectModeEnabled = true;

  const emitLog = (
    level: "debug" | "warn" | "error",
    message: string,
    context: Record<string, unknown>,
    error?: Error,
  ) => {
    logger({
      level,
      code: "live_edit_runtime_failed",
      message,
      scope: "live-edit",
      operation: "createLiveEditHandler",
      error: error instanceof Error ? (error as never) : undefined,
      timestamp: new Date().toISOString(),
      context,
    });
  };

  const reportRuntimeError = (
    error: unknown,
    context: Record<string, unknown>,
    message = "Live edit runtime failure",
  ) => {
    const normalized = normalizeNoMessError(error, {
      kind: "runtime",
      code: "live_edit_runtime_failed",
      operation: "live-edit",
      details: context,
    });

    try {
      config.onError?.(normalized);
    } catch (callbackError) {
      emitLog(
        "error",
        "Live edit onError callback threw unexpectedly",
        context,
        normalizeNoMessError(callbackError, {
          kind: "runtime",
          code: "live_edit_runtime_failed",
          operation: "live-edit.onError",
        }),
      );
    }

    emitLog("error", message, context, normalized);
  };

  const safeInvoke = (
    callback: (() => void) | undefined,
    context: Record<string, unknown>,
    message: string,
  ) => {
    if (!callback) return;

    try {
      callback();
    } catch (error) {
      reportRuntimeError(error, context, message);
    }
  };

  const safePostMessage = (
    message: Record<string, unknown>,
    context: Record<string, unknown>,
  ) => {
    try {
      window.parent.postMessage(message, config.adminOrigin);
    } catch (error) {
      reportRuntimeError(error, context, "Failed to post live edit message");
    }
  };

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
    container.dataset.selectMode = String(selectModeEnabled);
    document.body.appendChild(container);
  }

  function applySelectMode(enabled: boolean) {
    selectModeEnabled = enabled;
    if (container) {
      container.dataset.selectMode = String(enabled);
    }
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
      try {
        updateAllPositions();
      } catch (error) {
        reportRuntimeError(error, { phase: "updateAllPositions" });
      }
    });
  }

  function buildOverlays() {
    try {
      for (const entry of overlays) {
        entry.overlay.remove();
      }
      overlays = [];

      if (!container) return;

      const fieldElements = getFieldElements();
      const fieldRects: { fieldName: string; rect: SerializableRect }[] = [];

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
            safePostMessage(
              { type: "no-mess:field-clicked", fieldName },
              { phase: "field-clicked", fieldName },
            );

            try {
              config.onFieldClicked?.(fieldName);
            } catch (error) {
              reportRuntimeError(error, { phase: "field-clicked", fieldName });
            }
          });

          container.appendChild(overlay);
          overlays.push({ element, overlay, fieldName });

          const rect = element.getBoundingClientRect();
          fieldRects.push({ fieldName, rect: serializeRect(rect) });

          resizeObserver?.observe(element);
        }
      }

      const uniqueFields = [...new Set(fieldRects.map((field) => field.fieldName))];
      safePostMessage(
        {
          type: "no-mess:field-map",
          fields: uniqueFields.map((fieldName) => {
            const match = fieldRects.find((field) => field.fieldName === fieldName);
            return { fieldName, rect: match?.rect };
          }),
        },
        { phase: "field-map", count: uniqueFields.length },
      );
    } catch (error) {
      reportRuntimeError(error, { phase: "buildOverlays" }, "Failed to build live edit overlays");
    }
  }

  function enterLiveEdit() {
    if (active) return;
    active = true;

    try {
      injectStyles();
      createContainer();
      applySelectMode(selectModeEnabled);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          try {
            schedulePositionUpdate();
          } catch (error) {
            reportRuntimeError(error, { phase: "resizeObserver" });
          }
        });
      } else {
        emitLog("warn", "ResizeObserver is not available; live edit overlays will fall back to scroll/resize updates only", {
          feature: "ResizeObserver",
        });
      }

      buildOverlays();

      scrollListener = () => {
        try {
          schedulePositionUpdate();
        } catch (error) {
          reportRuntimeError(error, { phase: "scrollListener" });
        }
      };
      window.addEventListener("scroll", scrollListener, { passive: true });
      window.addEventListener("resize", scrollListener, { passive: true });

      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(() => {
          setTimeout(() => {
            if (!active) return;
            buildOverlays();
          }, 100);
        });
        mutationObserver.observe(document.body, {
          childList: true,
          subtree: true,
        });
      } else {
        emitLog("warn", "MutationObserver is not available; live edit overlays will not auto-refresh for DOM changes", {
          feature: "MutationObserver",
        });
      }

      safeInvoke(config.onEnter, { phase: "enter" }, "Live edit onEnter callback threw unexpectedly");
    } catch (error) {
      reportRuntimeError(error, { phase: "enterLiveEdit" });
    }
  }

  function exitLiveEdit() {
    if (!active) return;
    active = false;
    selectModeEnabled = true;

    try {
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

      safeInvoke(config.onExit, { phase: "exit" }, "Live edit onExit callback threw unexpectedly");
    } catch (error) {
      reportRuntimeError(error, { phase: "exitLiveEdit" });
    }
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

    try {
      switch (data.type) {
        case "no-mess:live-edit-enter":
          enterLiveEdit();
          break;
        case "no-mess:live-edit-exit":
          exitLiveEdit();
          break;
        case "no-mess:select-mode":
          if (typeof data.enabled !== "boolean") {
            emitLog("debug", "Ignored malformed live edit select mode message", {
              type: data.type,
            });
            break;
          }
          applySelectMode(data.enabled);
          break;
        case "no-mess:field-updated":
          if (!active) break;
          if (typeof data.fieldName !== "string") {
            emitLog("debug", "Ignored malformed live edit field update message", {
              type: data.type,
            });
            break;
          }
          handleFieldUpdate(data.fieldName, data.value);
          break;
        case "no-mess:field-focus":
          if (!active) break;
          if (typeof data.fieldName !== "string") {
            emitLog("debug", "Ignored malformed live edit focus message", {
              type: data.type,
            });
            break;
          }
          handleFieldFocus(data.fieldName);
          break;
        case "no-mess:field-blur":
          if (!active) break;
          if (typeof data.fieldName !== "string") {
            emitLog("debug", "Ignored malformed live edit blur message", {
              type: data.type,
            });
            break;
          }
          handleFieldBlur(data.fieldName);
          break;
      }
    } catch (error) {
      reportRuntimeError(error, {
        phase: "handleMessage",
        type: data.type,
      });
    }
  }

  window.addEventListener("message", handleMessage);

  return {
    cleanup: () => {
      window.removeEventListener("message", handleMessage);
      exitLiveEdit();
    },
  };
}
