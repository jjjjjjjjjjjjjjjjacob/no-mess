// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLiveEditHandler, NoMessError } from "../index.js";

const ADMIN_ORIGIN = "https://admin.no-mess.xyz";
const mockPostMessage = vi.fn();

describe("createLiveEditHandler", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    mockPostMessage.mockReset();

    Object.defineProperty(window, "parent", {
      value: { postMessage: mockPostMessage },
      configurable: true,
    });

    Object.defineProperty(globalThis, "requestAnimationFrame", {
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
      configurable: true,
    });

    Object.defineProperty(globalThis, "cancelAnimationFrame", {
      value: vi.fn(),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("degrades safely when ResizeObserver is unavailable", () => {
    const logger = vi.fn();
    const originalResizeObserver = globalThis.ResizeObserver;

    Object.defineProperty(globalThis, "ResizeObserver", {
      value: undefined,
      configurable: true,
    });

    const handler = createLiveEditHandler({
      adminOrigin: ADMIN_ORIGIN,
      logger,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:live-edit-enter" },
      }),
    );

    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
      }),
    );

    handler.cleanup();

    Object.defineProperty(globalThis, "ResizeObserver", {
      value: originalResizeObserver,
      configurable: true,
    });
  });

  it("logs malformed trusted-origin live edit messages safely", () => {
    const logger = vi.fn();
    const handler = createLiveEditHandler({
      adminOrigin: ADMIN_ORIGIN,
      logger,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:live-edit-enter" },
      }),
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:field-updated" },
      }),
    );

    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "debug",
        message: "Ignored malformed live edit field update message",
      }),
    );

    handler.cleanup();
  });

  it("surfaces overlay build failures via onError", () => {
    const onError = vi.fn();
    const querySelectorAll = vi
      .spyOn(document, "querySelectorAll")
      .mockImplementation(() => {
        throw new Error("query failed");
      });

    const handler = createLiveEditHandler({
      adminOrigin: ADMIN_ORIGIN,
      onError,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:live-edit-enter" },
      }),
    );

    expect(onError).toHaveBeenCalledWith(expect.any(NoMessError));
    querySelectorAll.mockRestore();
    handler.cleanup();
  });

  it("posts field maps with rect fallbacks when DOMRect lacks toJSON", () => {
    const element = document.createElement("div");
    element.setAttribute("data-no-mess-field", "title");
    element.getBoundingClientRect = vi.fn(() => ({
      x: 1,
      y: 2,
      width: 100,
      height: 20,
      top: 2,
      right: 101,
      bottom: 22,
      left: 1,
    })) as unknown as typeof element.getBoundingClientRect;
    document.body.appendChild(element);

    const handler = createLiveEditHandler({
      adminOrigin: ADMIN_ORIGIN,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:live-edit-enter" },
      }),
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "no-mess:field-map",
        fields: [
          expect.objectContaining({
            fieldName: "title",
            rect: expect.objectContaining({
              width: 100,
              height: 20,
            }),
          }),
        ],
      }),
      ADMIN_ORIGIN,
    );

    handler.cleanup();
  });

  it("toggles select mode without leaving live edit", () => {
    const element = document.createElement("div");
    element.setAttribute("data-no-mess-field", "title");
    element.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      top: 0,
      right: 100,
      bottom: 20,
      left: 0,
      toJSON: () => ({
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        top: 0,
        right: 100,
        bottom: 20,
        left: 0,
      }),
    })) as unknown as typeof element.getBoundingClientRect;
    document.body.appendChild(element);

    const handler = createLiveEditHandler({
      adminOrigin: ADMIN_ORIGIN,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:live-edit-enter" },
      }),
    );

    const overlayContainer = document.getElementById(
      "no-mess-live-edit-overlays",
    );
    expect(overlayContainer?.dataset.selectMode).toBe("true");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:select-mode", enabled: false },
      }),
    );

    expect(overlayContainer?.dataset.selectMode).toBe("false");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: ADMIN_ORIGIN,
        data: { type: "no-mess:field-updated", fieldName: "title", value: "Updated" },
      }),
    );

    expect(element.textContent).toBe("Updated");
    handler.cleanup();
  });
});
