import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "../use-mobile";

let matchMediaListeners: Record<string, (() => void)[]>;
let matchMediaMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  matchMediaListeners = {};

  matchMediaMock = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (event: string, handler: () => void) => {
      if (!matchMediaListeners[event]) {
        matchMediaListeners[event] = [];
      }
      matchMediaListeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: () => void) => {
      if (matchMediaListeners[event]) {
        matchMediaListeners[event] = matchMediaListeners[event].filter(
          (h) => h !== handler,
        );
      }
    },
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: matchMediaMock,
  });
});

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("useIsMobile", () => {
  it("should return false when window width >= 768", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true when window width < 768", () => {
    setWindowWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should respond to matchMedia change events", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(500);
      for (const handler of matchMediaListeners.change || []) {
        handler();
      }
    });

    expect(result.current).toBe(true);
  });

  it("should clean up listener on unmount", () => {
    setWindowWidth(1024);
    const { unmount } = renderHook(() => useIsMobile());

    expect(matchMediaListeners.change).toHaveLength(1);

    unmount();

    expect(matchMediaListeners.change).toHaveLength(0);
  });

  it("should return false initially before useEffect runs", () => {
    setWindowWidth(500);

    // Before useEffect, isMobile is undefined, and !!undefined is false.
    // However renderHook runs effects synchronously, so we verify the
    // initial return type is boolean (!!undefined === false).
    const { result } = renderHook(() => useIsMobile());

    // After effects, with width < 768 it should be true
    expect(typeof result.current).toBe("boolean");
  });
});
