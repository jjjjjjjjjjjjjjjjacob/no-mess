// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NoMessEntry,
  NoMessLogger,
} from "../../types.js";
import { DEFAULT_ADMIN_ORIGIN } from "../../types.js";

// --- Mocks ---

const mockStart = vi.fn();
const mockCleanup = vi.fn();
let capturedConfig: {
  client: { exchangePreviewSession: unknown };
  adminOrigin: string;
  onEntry: (entry: NoMessEntry) => void;
  onError: (error: Error) => void;
  logger?: NoMessLogger;
};

vi.mock("../../client.js", () => ({
  NoMessClient: vi.fn().mockImplementation((cfg: { apiKey: string; apiUrl?: string }) => ({
    _apiKey: cfg.apiKey,
    _apiUrl: cfg.apiUrl,
  })),
}));

vi.mock("../../index.js", () => ({
  createPreviewHandler: vi.fn((config: typeof capturedConfig) => {
    capturedConfig = config;
    return { start: mockStart, cleanup: mockCleanup };
  }),
}));

import { useNoMessPreview } from "../../react/use-no-mess-preview.js";
import { NoMessClient } from "../../client.js";

// --- Helpers ---

const mockEntry: NoMessEntry = {
  slug: "test",
  title: "Test Entry",
  _id: "e1",
  _createdAt: 1000,
  _updatedAt: 2000,
};

// --- Tests ---

describe("useNoMessPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial loading state", () => {
    const { result } = renderHook(() =>
      useNoMessPreview({ apiKey: "nm_test" }),
    );

    expect(result.current.entry).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe("waiting-for-admin");
  });

  it("calls createPreviewHandler with default adminOrigin", () => {
    renderHook(() => useNoMessPreview({ apiKey: "nm_test" }));

    expect(capturedConfig.adminOrigin).toBe(DEFAULT_ADMIN_ORIGIN);
  });

  it("creates NoMessClient with apiKey", () => {
    renderHook(() => useNoMessPreview({ apiKey: "nm_key123" }));

    expect(NoMessClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "nm_key123" }),
    );
  });

  it("passes custom apiUrl to NoMessClient", () => {
    renderHook(() =>
      useNoMessPreview({
        apiKey: "nm_test",
        apiUrl: "https://custom.api.com",
      }),
    );

    expect(NoMessClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: "https://custom.api.com" }),
    );
  });

  it("passes custom adminOrigin to handler", () => {
    renderHook(() =>
      useNoMessPreview({
        apiKey: "nm_test",
        adminOrigin: "https://custom.admin.com",
      }),
    );

    expect(capturedConfig.adminOrigin).toBe("https://custom.admin.com");
  });

  it("calls start on mount", () => {
    renderHook(() => useNoMessPreview({ apiKey: "nm_test" }));

    expect(mockStart).toHaveBeenCalledOnce();
  });

  it("calls cleanup on unmount", () => {
    const { unmount } = renderHook(() =>
      useNoMessPreview({ apiKey: "nm_test" }),
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalledOnce();
  });

  it("sets entry when onEntry is called", () => {
    const { result } = renderHook(() =>
      useNoMessPreview({ apiKey: "nm_test" }),
    );

    act(() => {
      capturedConfig.onEntry(mockEntry);
    });

    expect(result.current.entry).toEqual(mockEntry);
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe("ready");
  });

  it("sets error when onError is called", () => {
    const { result } = renderHook(() =>
      useNoMessPreview({ apiKey: "nm_test" }),
    );

    const err = new Error("Preview failed");
    act(() => {
      capturedConfig.onError(err);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.errorDetails).toBe(result.current.error);
    expect(result.current.errorDetails?.code).toBe("preview_exchange_failed");
    expect(result.current.entry).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe("error");
  });

  it("clears error when new entry arrives", () => {
    const { result } = renderHook(() =>
      useNoMessPreview({ apiKey: "nm_test" }),
    );

    act(() => {
      capturedConfig.onError(new Error("fail"));
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      capturedConfig.onEntry(mockEntry);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.errorDetails).toBeNull();
    expect(result.current.entry).toEqual(mockEntry);
    expect(result.current.status).toBe("ready");
  });

  it("forwards custom logger to handler and client", () => {
    const logger = vi.fn();

    renderHook(() =>
      useNoMessPreview({
        apiKey: "nm_test",
        logger,
      }),
    );

    expect(capturedConfig.logger).toBe(logger);
    expect(NoMessClient).toHaveBeenCalledWith(
      expect.objectContaining({ logger }),
    );
  });
});
