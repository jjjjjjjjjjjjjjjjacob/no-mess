// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NoMessEntry,
  PreviewHandlerConfig,
} from "../../types.js";

const mockReportLiveEditRoute = vi.fn().mockResolvedValue({ ok: true });
const mockExchangePreviewSession = vi.fn();
const mockPreviewStart = vi.fn();
const mockPreviewCleanup = vi.fn();
const mockLiveEditCleanup = vi.fn();
const mockParentPostMessage = vi.fn();

let capturedPreviewConfig: PreviewHandlerConfig | null = null;

vi.mock("../../client.js", () => ({
  NoMessClient: vi.fn().mockImplementation(() => ({
    reportLiveEditRoute: mockReportLiveEditRoute,
    exchangePreviewSession: mockExchangePreviewSession,
  })),
}));

vi.mock("../../index.js", () => ({
  createPreviewHandler: vi.fn((config: PreviewHandlerConfig) => {
    capturedPreviewConfig = config;
    return { start: mockPreviewStart, cleanup: mockPreviewCleanup };
  }),
}));

vi.mock("../../live-edit.js", () => ({
  createLiveEditHandler: vi.fn(() => ({
    cleanup: mockLiveEditCleanup,
  })),
}));

import {
  NoMessLiveRouteProvider,
  useNoMessEditableEntry,
} from "../../react/no-mess-provider.js";

const entry: NoMessEntry = {
  _id: "entry_1",
  _createdAt: 1000,
  _updatedAt: 2000,
  slug: "hello-world",
  title: "Published title",
  body: "Published body",
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NoMessLiveRouteProvider apiKey="nm_pub_test">
      {children}
    </NoMessLiveRouteProvider>
  );
}

describe("NoMessLiveRouteProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedPreviewConfig = null;
    localStorage.clear();
    window.history.replaceState({}, "", "/blog/hello-world?sid=abc&view=full");
    Object.defineProperty(window, "top", {
      value: window,
      configurable: true,
    });
    Object.defineProperty(window, "parent", {
      value: { postMessage: mockParentPostMessage },
      configurable: true,
    });
  });

  it("reports the normalized current route for an editable entry", async () => {
    renderHook(() => useNoMessEditableEntry(entry), { wrapper });

    await waitFor(() => {
      expect(mockReportLiveEditRoute).toHaveBeenCalledWith({
        entryId: "entry_1",
        url: "http://localhost:3000/blog/hello-world?view=full",
      });
    });
  });

  it("dedupes route reports in local storage", async () => {
    const { rerender } = renderHook(() => useNoMessEditableEntry(entry), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockReportLiveEditRoute.mock.calls.length).toBeGreaterThan(0);
    });
    const initialCallCount = mockReportLiveEditRoute.mock.calls.length;

    await waitFor(() => {
      expect(localStorage.length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(mockReportLiveEditRoute.mock.calls.length).toBe(initialCallCount);
    });

    rerender();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockReportLiveEditRoute.mock.calls.length).toBe(initialCallCount);
  });

  it("merges preview content and live field overrides for the targeted entry", async () => {
    Object.defineProperty(window, "top", {
      value: {},
      configurable: true,
    });

    const { result } = renderHook(() => useNoMessEditableEntry(entry), {
      wrapper,
    });

    expect(capturedPreviewConfig).not.toBeNull();

    act(() => {
      capturedPreviewConfig?.onEntry({
        ...entry,
        title: "Draft title",
        body: "Draft body",
      });
    });

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://admin.no-mess.xyz",
          data: {
            type: "no-mess:field-updated",
            fieldName: "title",
            value: "Unsaved title",
          },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.title).toBe("Unsaved title");
      expect(result.current.body).toBe("Draft body");
    });

    expect(mockParentPostMessage).toHaveBeenCalledWith(
      { type: "no-mess:entry-bound", entryId: "entry_1" },
      "https://admin.no-mess.xyz",
    );
  });
});
