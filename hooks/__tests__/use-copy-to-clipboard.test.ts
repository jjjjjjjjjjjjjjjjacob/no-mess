import { act, renderHook } from "@testing-library/react";
import { useCopyToClipboard } from "../use-copy-to-clipboard";

const writeTextMock = vi.fn();

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: writeTextMock,
    },
  });
  writeTextMock.mockReset();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCopyToClipboard", () => {
  it("should have copied as false initially", () => {
    writeTextMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("should set copied to true after successful copy", async () => {
    writeTextMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("hello");
    });

    expect(result.current.copied).toBe(true);
  });

  it("should reset copied to false after 2 seconds", async () => {
    vi.useFakeTimers();
    writeTextMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("hello");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("should set copied to false on clipboard failure", async () => {
    writeTextMock.mockRejectedValue(new Error("Clipboard access denied"));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("hello");
    });

    expect(result.current.copied).toBe(false);
  });

  it("should pass the correct text to clipboard.writeText", async () => {
    writeTextMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("some text to copy");
    });

    expect(writeTextMock).toHaveBeenCalledWith("some text to copy");
  });
});
